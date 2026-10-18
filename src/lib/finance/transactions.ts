import "server-only";
import { categoryLabel, getQuickCategories } from "@/lib/finance/categories";
import { formatMoney } from "@/lib/money";
import { whatsappEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { zonedParts } from "@/lib/time";
import { sendList, sendTemplate } from "@/lib/whatsapp/client";
import { isWindowOpen } from "@/lib/whatsapp/window";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Transaction = Tables<"transactions">;

// Ids de las filas de la lista interactiva: "cat:<transacción>:<categoría>" o "ign:<transacción>".
export const rowId = {
  category: (transactionId: string, categoryId: string) => `cat:${transactionId}:${categoryId}`,
  ignore: (transactionId: string) => `ign:${transactionId}`,
  parse(id: string): { action: "category"; transactionId: string; categoryId: string } | { action: "ignore"; transactionId: string } | null {
    const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
    const category = id.match(new RegExp(`^cat:(${uuid}):(${uuid})$`, "i"));
    if (category) return { action: "category", transactionId: category[1], categoryId: category[2] };
    const ignore = id.match(new RegExp(`^ign:(${uuid})$`, "i"));
    if (ignore) return { action: "ignore", transactionId: ignore[1] };
    return null;
  },
};

export function describeTransaction(transaction: Transaction, timeZone: string): string {
  const { day, month, hour, minute } = zonedParts(new Date(transaction.occurred_at), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  const where = transaction.merchant ? ` en *${transaction.merchant}*` : "";
  const origin = [transaction.bank_name, transaction.card_last4 ? `•${transaction.card_last4}` : null]
    .filter(Boolean)
    .join(" ");
  const meta = [origin || null, `${pad(day)}/${pad(month)} ${pad(hour)}:${pad(minute)}`].filter(Boolean).join(" · ");
  return `${formatMoney(Number(transaction.amount), transaction.currency)}${where}\n${meta}`;
}

export type NotifyResult = "sent" | "template" | "no_phone" | "window_closed" | "failed";

// Pide al usuario por WhatsApp la categoría de un movimiento.
// Dentro de la ventana de 24h envía una lista interactiva (gratis). Fuera de ella usa la plantilla
// aprobada si está configurada; si no, deja el movimiento pendiente para cuando el usuario escriba.
export async function notifyTransaction(transaction: Transaction, profile: Profile): Promise<NotifyResult> {
  if (!profile.whatsapp_phone) return "no_phone";
  const supabase = createAdminClient();
  const isExpense = transaction.type === "expense";

  if (isWindowOpen(profile.whatsapp_last_inbound_at)) {
    const categories = await getQuickCategories(profile.id, transaction.type, 9);
    const rows = [
      ...categories.map((category) => ({ id: rowId.category(transaction.id, category.id), title: categoryLabel(category) })),
      { id: rowId.ignore(transaction.id), title: "🚫 No contar", description: "Ej. transferencia entre mis cuentas" },
    ];
    const waMessageId = await sendList(
      profile.whatsapp_phone,
      {
        body: `${isExpense ? "💳 *Nuevo gasto*" : "💰 *Nuevo ingreso*"}\n${describeTransaction(transaction, profile.timezone)}\n\n¿En qué categoría lo pongo? Elige de la lista o respóndeme con un texto o audio (ej. "almuerzo").`,
        button: "Elegir categoría",
        sectionTitle: "Categorías",
        rows,
      },
      { userId: profile.id, transactionId: transaction.id },
    );
    if (!waMessageId) return "failed";
    await supabase.from("transactions").update({ notified_at: new Date().toISOString() }).eq("id", transaction.id);
    return "sent";
  }

  const { WHATSAPP_TEMPLATE_NEW_TRANSACTION, WHATSAPP_TEMPLATE_LANGUAGE } = whatsappEnv();
  if (WHATSAPP_TEMPLATE_NEW_TRANSACTION) {
    const waMessageId = await sendTemplate(
      profile.whatsapp_phone,
      {
        name: WHATSAPP_TEMPLATE_NEW_TRANSACTION,
        language: WHATSAPP_TEMPLATE_LANGUAGE,
        bodyParams: [
          formatMoney(Number(transaction.amount), transaction.currency),
          transaction.merchant ?? transaction.description ?? "un comercio",
        ],
      },
      {
        userId: profile.id,
        transactionId: transaction.id,
        logBody: `[plantilla ${WHATSAPP_TEMPLATE_NEW_TRANSACTION}] ${transaction.amount} ${transaction.currency}`,
      },
    );
    if (!waMessageId) return "failed";
    await supabase.from("transactions").update({ notified_at: new Date().toISOString() }).eq("id", transaction.id);
    return "template";
  }

  return "window_closed";
}

// El movimiento pendiente al que se refiere la respuesta del usuario:
// 1) si respondió citando un mensaje nuestro, el movimiento de ese mensaje;
// 2) si no, el último movimiento pendiente por el que le preguntamos.
export async function findTargetTransaction(userId: string, contextWaMessageId: string | null): Promise<Transaction | null> {
  const supabase = createAdminClient();

  if (contextWaMessageId) {
    const { data: quoted } = await supabase
      .from("whatsapp_messages")
      .select("transaction_id")
      .eq("wa_message_id", contextWaMessageId)
      .eq("user_id", userId)
      .not("transaction_id", "is", null)
      .maybeSingle();
    if (quoted?.transaction_id) {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", quoted.transaction_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (data) return data;
    }
  }

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .not("notified_at", "is", null)
    .order("notified_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getTransaction(userId: string, transactionId: string): Promise<Transaction | null> {
  const { data } = await createAdminClient()
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function categorizeTransaction(
  transaction: Transaction,
  category: Tables<"categories">,
  details: { by: "ai" | "user"; confidence: number | null; note: string | null },
): Promise<Transaction> {
  const { data, error } = await createAdminClient()
    .from("transactions")
    .update({
      category_id: category.id,
      status: "categorized",
      categorized_by: details.by,
      ai_confidence: details.by === "ai" ? details.confidence : null,
      ...(details.note ? { user_note: details.note } : {}),
    })
    .eq("id", transaction.id)
    .eq("user_id", transaction.user_id)
    .select("*")
    .single();
  if (error) throw new Error(`No se pudo categorizar: ${error.message}`);
  return data;
}

export async function ignoreTransaction(transaction: Transaction): Promise<void> {
  const { error } = await createAdminClient()
    .from("transactions")
    .update({ status: "ignored", category_id: null, categorized_by: "user" })
    .eq("id", transaction.id)
    .eq("user_id", transaction.user_id);
  if (error) throw new Error(`No se pudo ignorar el movimiento: ${error.message}`);
}

export async function countPending(userId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");
  return count ?? 0;
}

// Pregunta por el siguiente movimiento pendiente (el más antiguo).
// onlyUnnotified = true: solo los que aún no se preguntaron (llegaron con la ventana de 24h cerrada).
// Se llama cada vez que el usuario escribe, porque eso reabre la ventana.
export async function promptNextPending(profile: Profile, options: { onlyUnnotified: boolean }): Promise<boolean> {
  let query = createAdminClient()
    .from("transactions")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "pending");
  if (options.onlyUnnotified) query = query.is("notified_at", null);
  const { data } = await query.order("occurred_at", { ascending: true }).limit(1).maybeSingle();
  if (!data) return false;
  const result = await notifyTransaction(data, profile);
  return result === "sent" || result === "template";
}
