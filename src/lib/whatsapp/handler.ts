import "server-only";
import { AiUnavailableError } from "@/lib/ai/gemini";
import { interpretMessage, type Interpretation } from "@/lib/ai/interpret-message";
import { userHasAccess } from "@/lib/finance/access";
import { checkBudgetAlerts } from "@/lib/finance/budgets";
import { categoryLabel, getUserCategories } from "@/lib/finance/categories";
import { buildMonthSummary } from "@/lib/finance/summary";
import {
  categorizeTransaction,
  countPending,
  findTargetTransaction,
  getTransaction,
  ignoreTransaction,
  promptNextPending,
  rowId,
} from "@/lib/finance/transactions";
import { formatMoney } from "@/lib/money";
import { whatsappEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadMedia, markAsReadWithTyping, sendText } from "@/lib/whatsapp/client";
import { forwardingAddress, linkPhoneWithCode } from "@/lib/whatsapp/link";
import { botText } from "@/lib/whatsapp/messages";
import type { Tables } from "@/types/database";

// ---------- Tipos del webhook de Meta (solo los campos que usamos) ----------

type InboundMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  interactive?: {
    type: "list_reply" | "button_reply";
    list_reply?: { id: string; title: string };
    button_reply?: { id: string; title: string };
  };
  button?: { text: string; payload?: string };
  context?: { id?: string };
};

type StatusUpdate = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  errors?: { code: number; title?: string; message?: string }[];
};

export type WebhookPayload = {
  object?: string;
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: InboundMessage[];
        statuses?: StatusUpdate[];
      };
    }[];
  }[];
};

// ---------- Punto de entrada ----------

export async function handleWebhook(payload: WebhookPayload): Promise<void> {
  if (payload.object !== "whatsapp_business_account") return;
  const { WHATSAPP_PHONE_NUMBER_ID } = whatsappEnv();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;
      // Ignora eventos de otros números de la misma cuenta de Meta.
      if (change.value.metadata?.phone_number_id && change.value.metadata.phone_number_id !== WHATSAPP_PHONE_NUMBER_ID) {
        continue;
      }
      for (const status of change.value.statuses ?? []) {
        await handleStatus(status);
      }
      for (const message of change.value.messages ?? []) {
        try {
          await handleMessage(message);
        } catch (error) {
          console.error("[whatsapp] error procesando mensaje", message.id, error);
          await sendText(message.from, error instanceof AiUnavailableError ? botText.aiBusy() : botText.error(), {
            userId: null,
          });
        }
      }
    }
  }
}

async function handleStatus(status: StatusUpdate) {
  const error = status.errors?.map((item) => `${item.code}: ${item.message ?? item.title ?? ""}`).join("; ") || null;
  await createAdminClient()
    .from("whatsapp_messages")
    .update({ status: status.status, ...(error ? { error } : {}) })
    .eq("wa_message_id", status.id)
    .eq("direction", "outbound");
}

// ---------- Mensajes entrantes ----------

function messageText(message: InboundMessage): string | null {
  if (message.type === "text") return message.text?.body ?? null;
  if (message.type === "button") return message.button?.text ?? null;
  return null;
}

async function handleMessage(message: InboundMessage) {
  const supabase = createAdminClient();
  const phone = message.from;
  const text = messageText(message)?.trim() ?? null;
  const interactiveId =
    message.type === "interactive"
      ? (message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id ?? null)
      : null;
  const interactiveTitle =
    message.interactive?.list_reply?.title ?? message.interactive?.button_reply?.title ?? null;

  // 1) Registro + deduplicación: Meta puede reenviar el mismo evento varias veces.
  const { error: insertError } = await supabase.from("whatsapp_messages").insert({
    wa_message_id: message.id,
    direction: "inbound",
    phone,
    message_type: message.type,
    body: text ?? interactiveTitle ?? (message.type === "audio" ? "[nota de voz]" : `[${message.type}]`),
    status: "received",
  });
  if (insertError?.code === "23505") return;
  if (insertError) throw new Error(`No se pudo registrar el mensaje: ${insertError.message}`);

  // 2) Vinculación con código: "VINCULAR 123456" o solo "123456".
  const codeMatch = text?.match(/^(?:vincular\s*)?(\d{6})$/i);
  let { data: profile } = await supabase.from("profiles").select("*").eq("whatsapp_phone", phone).maybeSingle();

  if (codeMatch) {
    const linked = await linkPhoneWithCode(codeMatch[1], phone);
    if (linked) {
      await supabase.from("whatsapp_messages").update({ user_id: linked.id }).eq("wa_message_id", message.id);
      await sendText(phone, botText.welcome(linked.full_name, forwardingAddress(linked.inbound_token)), {
        userId: linked.id,
      });
      if (linked.gmail_forwarding_code) {
        await sendText(phone, botText.gmailCode(linked.gmail_forwarding_code), { userId: linked.id });
      }
      return;
    }
    if (!profile) {
      await sendText(phone, botText.invalidCode(), { userId: null });
      return;
    }
  }

  if (!profile) {
    await sendText(phone, botText.unknownNumber(), { userId: null });
    return;
  }

  // 3) El usuario escribió: se reabre la ventana gratuita de 24h.
  const now = new Date().toISOString();
  const { data: refreshed } = await supabase
    .from("profiles")
    .update({ whatsapp_last_inbound_at: now })
    .eq("id", profile.id)
    .select("*")
    .single();
  profile = refreshed ?? { ...profile, whatsapp_last_inbound_at: now };
  await supabase.from("whatsapp_messages").update({ user_id: profile.id }).eq("wa_message_id", message.id);
  await markAsReadWithTyping(message.id);

  // 4) Paywall.
  if (!(await userHasAccess(profile.id, profile.trial_ends_at))) {
    await sendText(phone, botText.paywall(), { userId: profile.id });
    return;
  }

  // 5) Respuesta desde la lista interactiva (no necesita IA).
  if (interactiveId) {
    await handleListReply(profile, interactiveId);
    return;
  }

  // 6) Atajos sin IA (ahorran cuota de Gemini).
  if (text && /^(ayuda|help|menu|menú|hola|holi|buenas)[\s!.?]*$/i.test(text)) {
    await sendText(phone, botText.help(), { userId: profile.id });
    await promptNextPending(profile, { onlyUnnotified: true });
    return;
  }
  if (text && /^resumen[\s!.?]*$/i.test(text)) {
    await sendText(phone, await buildMonthSummary(profile), { userId: profile.id });
    await promptNextPending(profile, { onlyUnnotified: true });
    return;
  }

  // 7) Texto o nota de voz -> Gemini.
  let input: Parameters<typeof interpretMessage>[0]["message"];
  if (text) {
    input = { kind: "text", text };
  } else if (message.type === "audio" && message.audio?.id) {
    const media = await downloadMedia(message.audio.id);
    input = { kind: "audio", base64: media.base64, mimeType: media.mimeType };
  } else {
    await sendText(phone, botText.unsupported(), { userId: profile.id });
    return;
  }

  const [pending, categories] = await Promise.all([
    findTargetTransaction(profile.id, message.context?.id ?? null),
    getUserCategories(profile.id),
  ]);
  const result = await interpretMessage({ message: input, pending, categories, timeZone: profile.timezone });

  if (result.transcript) {
    await supabase
      .from("whatsapp_messages")
      .update({ body: `[nota de voz] ${result.transcript}`.slice(0, 4000) })
      .eq("wa_message_id", message.id);
  }

  await applyInterpretation(profile, pending, result);
}

async function handleListReply(profile: Tables<"profiles">, id: string) {
  const phone = profile.whatsapp_phone!;
  const parsed = rowId.parse(id);
  if (!parsed) {
    await sendText(phone, botText.unclear(), { userId: profile.id });
    return;
  }
  const transaction = await getTransaction(profile.id, parsed.transactionId);
  if (!transaction) {
    await sendText(phone, "Ese movimiento ya no existe.", { userId: profile.id });
    return;
  }

  if (parsed.action === "ignore") {
    await ignoreTransaction(transaction);
    await sendText(phone, `🚫 Listo, no contaré ${formatMoney(Number(transaction.amount), transaction.currency)}.`, {
      userId: profile.id,
      transactionId: transaction.id,
    });
  } else {
    const category = (await getUserCategories(profile.id)).find((item) => item.id === parsed.categoryId);
    if (!category) {
      await sendText(phone, "Esa categoría ya no existe. Respóndeme con otra.", { userId: profile.id });
      return;
    }
    await categorizeTransaction(transaction, category, { by: "user", confidence: null, note: null });
    await sendText(
      phone,
      `✅ ${formatMoney(Number(transaction.amount), transaction.currency)} → ${categoryLabel(category)}`,
      { userId: profile.id, transactionId: transaction.id },
    );
    await checkBudgetAlerts(profile, category.id);
  }
  await afterResolved(profile);
}

async function applyInterpretation(
  profile: Tables<"profiles">,
  pending: Tables<"transactions"> | null,
  result: Interpretation,
) {
  const phone = profile.whatsapp_phone!;
  const heard = result.transcript ? botText.heard(result.transcript) : "";
  const supabase = createAdminClient();

  switch (result.intent) {
    case "categorize_pending": {
      const updated = await categorizeTransaction(pending!, result.category, {
        by: "ai",
        confidence: result.confidence,
        note: result.note,
      });
      await sendText(
        phone,
        `${heard}✅ ${formatMoney(Number(updated.amount), updated.currency)}${updated.merchant ? ` en ${updated.merchant}` : ""} → ${categoryLabel(result.category)}`,
        { userId: profile.id, transactionId: updated.id },
      );
      await checkBudgetAlerts(profile, result.category.id);
      await afterResolved(profile);
      return;
    }

    case "ignore_pending": {
      await ignoreTransaction(pending!);
      await sendText(phone, `${heard}🚫 Listo, no contaré ${formatMoney(Number(pending!.amount), pending!.currency)}.`, {
        userId: profile.id,
        transactionId: pending!.id,
      });
      await afterResolved(profile);
      return;
    }

    case "new_transaction": {
      const { data: created, error } = await supabase
        .from("transactions")
        .insert({
          user_id: profile.id,
          type: result.type,
          amount: result.amount,
          currency: result.currency,
          merchant: result.merchant,
          user_note: result.note,
          source: "whatsapp",
          occurred_at: new Date().toISOString(),
          notified_at: new Date().toISOString(),
          status: result.category ? "categorized" : "pending",
          category_id: result.category?.id ?? null,
          categorized_by: result.category ? "ai" : null,
          ai_confidence: result.category ? result.confidence : null,
        })
        .select("*")
        .single();
      if (error) throw new Error(`No se pudo registrar el movimiento: ${error.message}`);

      const kind = result.type === "expense" ? "Gasto" : "Ingreso";
      const category = result.category ? ` → ${categoryLabel(result.category)}` : "";
      const followUp = result.category ? "" : `\n¿En qué categoría lo pongo?`;
      await sendText(
        phone,
        `${heard}📝 ${kind} registrado: ${formatMoney(result.amount, result.currency)}${result.merchant ? ` en ${result.merchant}` : ""}${category}${followUp}`,
        { userId: profile.id, transactionId: created.id },
      );
      if (result.category && result.type === "expense") await checkBudgetAlerts(profile, result.category.id);
      return;
    }

    case "summary":
      await sendText(phone, `${heard}${await buildMonthSummary(profile)}`, { userId: profile.id });
      await promptNextPending(profile, { onlyUnnotified: true });
      return;

    case "help":
      await sendText(phone, `${heard}${botText.help()}`, { userId: profile.id });
      await promptNextPending(profile, { onlyUnnotified: true });
      return;

    case "unclear":
      await sendText(phone, `${heard}${pending ? botText.unclearWithPending() : botText.unclear()}`, {
        userId: profile.id,
        transactionId: pending?.id ?? null,
      });
      return;
  }
}

// Tras resolver un movimiento, pregunta por el siguiente pendiente (si hay).
async function afterResolved(profile: Tables<"profiles">) {
  const remaining = await countPending(profile.id);
  if (remaining === 0) return;
  if (remaining > 1) {
    await sendText(profile.whatsapp_phone!, `Te quedan ${remaining} movimientos por categorizar 👇`, {
      userId: profile.id,
    });
  }
  await promptNextPending(profile, { onlyUnnotified: false });
}
