"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseLocalDateTime } from "@/lib/time";
import { createLinkCode } from "@/lib/whatsapp/link";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const uuid = z.uuid();
const amountSchema = z.coerce
  .number({ message: "Escribe un monto válido." })
  .positive("El monto debe ser mayor a 0.")
  .max(999_999_999, "El monto es demasiado grande.")
  .transform((value) => Math.round(value * 100) / 100);

function refresh() {
  revalidatePath("/app", "layout");
}

// ---------- Movimientos ----------

export async function setTransactionCategory(transactionId: string, categoryId: string | null): Promise<ActionResult> {
  await requireSession();
  if (!uuid.safeParse(transactionId).success) return { ok: false, error: "Movimiento inválido." };
  if (categoryId !== null && !uuid.safeParse(categoryId).success) return { ok: false, error: "Categoría inválida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update(
      categoryId
        ? { category_id: categoryId, status: "categorized", categorized_by: "user" }
        : { category_id: null, status: "pending", categorized_by: null },
    )
    .eq("id", transactionId);
  if (error) return { ok: false, error: "No se pudo guardar la categoría." };
  refresh();
  return { ok: true };
}

export async function setTransactionIgnored(transactionId: string, ignored: boolean): Promise<ActionResult> {
  await requireSession();
  if (!uuid.safeParse(transactionId).success) return { ok: false, error: "Movimiento inválido." };
  const supabase = await createClient();
  const { data: current } = await supabase.from("transactions").select("category_id").eq("id", transactionId).single();
  const { error } = await supabase
    .from("transactions")
    .update({
      status: ignored ? "ignored" : current?.category_id ? "categorized" : "pending",
      categorized_by: "user",
    })
    .eq("id", transactionId);
  if (error) return { ok: false, error: "No se pudo actualizar el movimiento." };
  refresh();
  return { ok: true };
}

export async function deleteTransaction(transactionId: string): Promise<ActionResult> {
  await requireSession();
  if (!uuid.safeParse(transactionId).success) return { ok: false, error: "Movimiento inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  refresh();
  return { ok: true };
}

export async function createManualTransaction(_: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireSession();
  const parsed = z
    .object({
      type: z.enum(["expense", "income"]),
      amount: amountSchema,
      currency: z.string().regex(/^[A-Z]{3}$/),
      merchant: z.string().trim().max(200).optional(),
      categoryId: z.union([uuid, z.literal("")]),
      occurredAt: z.string().optional(),
    })
    .safeParse({
      type: formData.get("type"),
      amount: formData.get("amount"),
      currency: formData.get("currency"),
      merchant: formData.get("merchant") ?? undefined,
      categoryId: formData.get("categoryId") ?? "",
      occurredAt: formData.get("occurredAt") ?? undefined,
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const occurredAt = parseLocalDateTime(parsed.data.occurredAt, profile.timezone) ?? new Date();
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    merchant: parsed.data.merchant || null,
    category_id: parsed.data.categoryId || null,
    status: parsed.data.categoryId ? "categorized" : "pending",
    categorized_by: parsed.data.categoryId ? "user" : null,
    occurred_at: occurredAt.toISOString(),
    source: "manual",
  });
  if (error) return { ok: false, error: "No se pudo registrar el movimiento." };
  refresh();
  return { ok: true, message: "Movimiento registrado." };
}

// ---------- Presupuestos ----------

export async function saveBudget(_: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const { userId } = await requireSession();
  const parsed = z
    .object({
      categoryId: z.union([uuid, z.literal("")]),
      amount: amountSchema,
      alertThreshold: z.coerce.number().int().min(10).max(100),
    })
    .safeParse({
      categoryId: formData.get("categoryId") ?? "",
      amount: formData.get("amount"),
      alertThreshold: formData.get("alertThreshold") ?? 80,
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: userId,
      category_id: parsed.data.categoryId || null,
      amount: parsed.data.amount,
      alert_threshold: parsed.data.alertThreshold / 100,
      last_alert_month: null,
    },
    { onConflict: "user_id,category_id" },
  );
  if (error) return { ok: false, error: "No se pudo guardar el presupuesto." };
  refresh();
  return { ok: true, message: "Presupuesto guardado." };
}

export async function deleteBudget(budgetId: string): Promise<ActionResult> {
  await requireSession();
  if (!uuid.safeParse(budgetId).success) return { ok: false, error: "Presupuesto inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  refresh();
  return { ok: true };
}

// ---------- Perfil y categorías ----------

export async function updateProfile(_: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const { userId } = await requireSession();
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
      currency: z.enum(["PEN", "USD"]),
      timezone: z.string().min(3).max(60),
    })
    .safeParse({
      fullName: formData.get("fullName"),
      currency: formData.get("currency"),
      timezone: formData.get("timezone"),
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, currency: parsed.data.currency, timezone: parsed.data.timezone })
    .eq("id", userId);
  if (error) return { ok: false, error: "No se pudo guardar. Revisa la zona horaria." };
  refresh();
  return { ok: true, message: "Datos guardados." };
}

export async function createCategory(_: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const { userId } = await requireSession();
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Escribe un nombre.").max(40, "Máximo 40 caracteres."),
      emoji: z.string().trim().max(8).optional(),
      kind: z.enum(["expense", "income"]),
    })
    .safeParse({ name: formData.get("name"), emoji: formData.get("emoji") || undefined, kind: formData.get("kind") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: parsed.data.name, emoji: parsed.data.emoji || null, kind: parsed.data.kind });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Ya tienes una categoría con ese nombre." : "No se pudo crear." };
  }
  refresh();
  return { ok: true, message: "Categoría creada." };
}

export async function setCategoryArchived(categoryId: string, archived: boolean): Promise<ActionResult> {
  await requireSession();
  if (!uuid.safeParse(categoryId).success) return { ok: false, error: "Categoría inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ is_archived: archived }).eq("id", categoryId);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  refresh();
  return { ok: true };
}

// ---------- WhatsApp ----------

export async function generateWhatsappCode(): Promise<
  { ok: true; code: string; waLink: string | null; expiresAt: string } | { ok: false; error: string }
> {
  const { userId } = await requireSession();
  try {
    const result = await createLinkCode(userId);
    return { ok: true, ...result };
  } catch {
    return { ok: false, error: "No se pudo generar el código. Inténtalo de nuevo." };
  }
}

export async function unlinkWhatsapp(): Promise<ActionResult> {
  const { userId } = await requireSession();
  // El número solo lo puede cambiar el servidor (permisos por columna), por eso se usa el cliente admin.
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ whatsapp_phone: null, whatsapp_linked_at: null })
    .eq("id", userId);
  if (error) return { ok: false, error: "No se pudo desvincular." };
  refresh();
  return { ok: true, message: "WhatsApp desvinculado." };
}
