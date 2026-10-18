import "server-only";
import { createClient } from "@/lib/supabase/server";
import { MONTH_NAMES_ES, zonedParts, zonedTimeToUtc } from "@/lib/time";
import type { Tables } from "@/types/database";

export type TransactionWithCategory = Tables<"transactions"> & {
  categories: Pick<Tables<"categories">, "id" | "name" | "emoji" | "color"> | null;
};

export type MonthRef = { year: number; month: number; key: string; label: string };

// "2026-10" -> mes; si no es válido, el mes actual del usuario.
export function resolveMonth(value: string | string[] | undefined, timeZone: string): MonthRef {
  const now = zonedParts(new Date(), timeZone);
  const match = typeof value === "string" ? value.match(/^(\d{4})-(\d{2})$/) : null;
  let year = now.year;
  let month = now.month;
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    if (m >= 1 && m <= 12 && y >= 2000 && y <= now.year + 1) {
      year = y;
      month = m;
    }
  }
  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: `${MONTH_NAMES_ES[month - 1][0].toUpperCase()}${MONTH_NAMES_ES[month - 1].slice(1)} ${year}`,
  };
}

export function shiftMonth(ref: MonthRef, delta: number): string {
  const index = ref.year * 12 + (ref.month - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function isCurrentMonth(ref: MonthRef, timeZone: string) {
  const now = zonedParts(new Date(), timeZone);
  return now.year === ref.year && now.month === ref.month;
}

export async function getMonthTransactions(ref: MonthRef, timeZone: string): Promise<TransactionWithCategory[]> {
  const start = zonedTimeToUtc(ref.year, ref.month, 1, 0, 0, timeZone);
  const next = ref.month === 12 ? { y: ref.year + 1, m: 1 } : { y: ref.year, m: ref.month + 1 };
  const end = zonedTimeToUtc(next.y, next.m, 1, 0, 0, timeZone);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, categories(id, name, emoji, color)")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", end.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`No se pudieron leer los movimientos: ${error.message}`);
  return data as TransactionWithCategory[];
}

export async function getCategories(): Promise<Tables<"categories">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(`No se pudieron leer las categorías: ${error.message}`);
  return data;
}

export type MonthSummary = {
  currency: string;
  otherCurrencies: { currency: string; expense: number; income: number }[];
  expense: number;
  income: number;
  pendingCount: number;
  byCategory: { id: string; label: string; amount: number }[];
  daily: { day: number; amount: number }[];
};

// Totales del mes. Los gráficos usan la moneda principal del usuario (o la más usada del mes).
export function summarizeMonth(
  transactions: TransactionWithCategory[],
  ref: MonthRef,
  profileCurrency: string,
  timeZone: string,
): MonthSummary {
  const counted = transactions.filter((transaction) => transaction.status !== "ignored");
  const usage = new Map<string, number>();
  for (const transaction of counted) usage.set(transaction.currency, (usage.get(transaction.currency) ?? 0) + 1);
  const currency =
    usage.has(profileCurrency) || usage.size === 0
      ? profileCurrency
      : [...usage.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const daysInMonth = new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();
  const daily = Array.from({ length: daysInMonth }, (_, index) => ({ day: index + 1, amount: 0 }));
  const categories = new Map<string, { id: string; label: string; amount: number }>();
  const others = new Map<string, { currency: string; expense: number; income: number }>();
  let expense = 0;
  let income = 0;

  for (const transaction of counted) {
    const amount = Number(transaction.amount);
    if (transaction.currency !== currency) {
      const bucket = others.get(transaction.currency) ?? { currency: transaction.currency, expense: 0, income: 0 };
      if (transaction.type === "expense") bucket.expense += amount;
      else bucket.income += amount;
      others.set(transaction.currency, bucket);
      continue;
    }
    if (transaction.type === "income") {
      income += amount;
      continue;
    }
    expense += amount;
    const { day } = zonedParts(new Date(transaction.occurred_at), timeZone);
    daily[day - 1].amount += amount;
    const key = transaction.categories?.id ?? "sin-categoria";
    const label = transaction.categories
      ? `${transaction.categories.emoji ?? ""} ${transaction.categories.name}`.trim()
      : "⏳ Sin categoría";
    const entry = categories.get(key) ?? { id: key, label, amount: 0 };
    entry.amount += amount;
    categories.set(key, entry);
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    currency,
    otherCurrencies: [...others.values()].map((item) => ({
      ...item,
      expense: round(item.expense),
      income: round(item.income),
    })),
    expense: round(expense),
    income: round(income),
    pendingCount: transactions.filter((transaction) => transaction.status === "pending").length,
    byCategory: [...categories.values()]
      .map((item) => ({ ...item, amount: round(item.amount) }))
      .sort((a, b) => b.amount - a.amount),
    daily: daily.map((item) => ({ ...item, amount: round(item.amount) })),
  };
}
