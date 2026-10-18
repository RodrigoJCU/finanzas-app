import "server-only";
import { formatMoney } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONTH_NAMES_ES, monthRange, zonedParts } from "@/lib/time";
import type { Tables } from "@/types/database";

// Resumen del mes en curso para enviar por WhatsApp.
export async function buildMonthSummary(profile: Tables<"profiles">): Promise<string> {
  const supabase = createAdminClient();
  const { start, end } = monthRange(profile.timezone);
  const { month } = zonedParts(new Date(), profile.timezone);

  const [{ data: transactions, error }, { data: budgets }] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, currency, status, categories(name, emoji)")
      .eq("user_id", profile.id)
      .neq("status", "ignored")
      .gte("occurred_at", start.toISOString())
      .lt("occurred_at", end.toISOString()),
    supabase.from("budget_progress").select("*").eq("user_id", profile.id),
  ]);
  if (error) throw new Error(`No se pudo calcular el resumen: ${error.message}`);

  const title = `📊 *Resumen de ${MONTH_NAMES_ES[month - 1]}*`;
  if (!transactions?.length) {
    return `${title}\nAún no tienes movimientos este mes.`;
  }

  // Totales por moneda (en Perú es común tener soles y dólares).
  const byCurrency = new Map<
    string,
    { expense: number; income: number; pending: number; categories: Map<string, number> }
  >();
  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    const bucket = byCurrency.get(transaction.currency) ?? {
      expense: 0,
      income: 0,
      pending: 0,
      categories: new Map<string, number>(),
    };
    if (transaction.type === "income") {
      bucket.income += amount;
    } else {
      bucket.expense += amount;
      if (transaction.status === "pending" || !transaction.categories) {
        bucket.pending += amount;
      } else {
        const label = `${transaction.categories.emoji ?? "•"} ${transaction.categories.name}`;
        bucket.categories.set(label, (bucket.categories.get(label) ?? 0) + amount);
      }
    }
    byCurrency.set(transaction.currency, bucket);
  }

  const sections: string[] = [title];
  for (const [currency, bucket] of byCurrency) {
    const lines = [`\n*${currency}*`, `Gastos: ${formatMoney(bucket.expense, currency)}`];
    if (bucket.income > 0) lines.push(`Ingresos: ${formatMoney(bucket.income, currency)}`);
    const top = [...bucket.categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    for (const [label, amount] of top) lines.push(`${label}: ${formatMoney(amount, currency)}`);
    if (bucket.pending > 0) lines.push(`⏳ Sin categoría: ${formatMoney(bucket.pending, currency)}`);
    sections.push(lines.join("\n"));
  }

  if (budgets?.length) {
    const lines = ["\n*Presupuestos*"];
    for (const budget of budgets) {
      const name = budget.category_id ? `${budget.category_emoji ?? ""} ${budget.category_name}`.trim() : "Total del mes";
      const percent = Math.round(Number(budget.ratio) * 100);
      const icon = percent >= 100 ? "🔴" : percent >= Number(budget.alert_threshold) * 100 ? "🟡" : "🟢";
      lines.push(
        `${icon} ${name}: ${formatMoney(Number(budget.spent), budget.currency)} / ${formatMoney(Number(budget.budget_amount), budget.currency)} (${percent}%)`,
      );
    }
    sections.push(lines.join("\n"));
  }

  return sections.join("\n");
}
