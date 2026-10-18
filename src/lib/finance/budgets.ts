import "server-only";
import { formatMoney } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { monthRange } from "@/lib/time";
import { sendText } from "@/lib/whatsapp/client";
import type { Tables } from "@/types/database";

// Avisa por WhatsApp si un gasto hizo cruzar el umbral de un presupuesto (una vez por mes).
// Se revisan el presupuesto de la categoría y el presupuesto total del mes.
export async function checkBudgetAlerts(profile: Tables<"profiles">, categoryId: string | null): Promise<void> {
  if (!profile.whatsapp_phone) return;
  const supabase = createAdminClient();
  const { monthKey } = monthRange(profile.timezone);

  let query = supabase.from("budget_progress").select("*").eq("user_id", profile.id);
  query = categoryId ? query.or(`category_id.is.null,category_id.eq.${categoryId}`) : query.is("category_id", null);
  const { data: rows, error } = await query;
  if (error) {
    console.error("[budgets] no se pudo leer el progreso", error.message);
    return;
  }

  for (const row of rows ?? []) {
    const ratio = Number(row.ratio);
    if (ratio < Number(row.alert_threshold) || row.last_alert_month === monthKey) continue;

    // Reserva la alerta antes de enviarla para no duplicarla si llegan dos mensajes a la vez.
    const { data: claimed } = await supabase
      .from("budgets")
      .update({ last_alert_month: monthKey })
      .eq("id", row.budget_id)
      .or(`last_alert_month.is.null,last_alert_month.neq.${monthKey}`)
      .select("id");
    if (!claimed?.length) continue;

    const name = row.category_id ? `${row.category_emoji ?? ""} ${row.category_name}`.trim() : "tu presupuesto total";
    const percent = Math.round(ratio * 100);
    const spent = formatMoney(Number(row.spent), row.currency);
    const budget = formatMoney(Number(row.budget_amount), row.currency);
    const text =
      ratio >= 1
        ? `🚨 *Presupuesto superado*\nEn ${name} llevas ${spent} de ${budget} este mes (${percent}%).`
        : `⚠️ *Atención con tu presupuesto*\nEn ${name} ya usaste el ${percent}%: ${spent} de ${budget}.\nTe quedan ${formatMoney(Number(row.remaining), row.currency)} este mes.`;
    await sendText(profile.whatsapp_phone, text, { userId: profile.id });
  }
}
