import { formatMoney } from "@/lib/money";
import { zonedParts } from "@/lib/time";
import type { Views } from "@/types/database";
import type { MonthRef, TransactionWithCategory } from "./month";

// Datos ya calculados para pintar el dashboard (sirven igual para datos reales y para la demo de la web).

export type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  amount: number;
  currency: string;
  type: "expense" | "income";
  when: string;
  pending: boolean;
};

export type Insight = { tone: "up" | "down" | "info" | "warning"; title: string; tag: string; detail: string; note?: string };

export type DashboardData = {
  currency: string;
  currencies: string[];
  total: number;
  income: number;
  changeVsPrevious: number | null;
  today: { amount: number; avgPerDay: number; biggest: { name: string; amount: number } | null; spark: number[] };
  sources: { label: string; amount: number; share: number }[];
  budget: {
    amount: number;
    spent: number;
    ratio: number;
    remaining: number;
    categories: { label: string; ratio: number }[];
  } | null;
  activity: ActivityItem[];
  merchants: { name: string; count: number; amount: number; share: number; emoji: string; color: string }[];
  accounts: { label: string; kind: string; amount: number }[];
  insights: Insight[];
  pendingCount: number;
};

const FALLBACK_COLOR = "#94a3b8";
const round = (value: number) => Math.round(value * 100) / 100;

function sourceLabel(transaction: TransactionWithCategory): string {
  if (transaction.bank_name) return transaction.card_last4 ? `${transaction.bank_name} ··${transaction.card_last4}` : transaction.bank_name;
  if (transaction.source === "whatsapp") return "WhatsApp";
  if (transaction.source === "manual") return "Efectivo / manual";
  return "Correo";
}

function relativeWhen(iso: string, timeZone: string, now: Date): string {
  const date = new Date(iso);
  const today = zonedParts(now, timeZone);
  const day = zonedParts(date, timeZone);
  const time = new Intl.DateTimeFormat("es-PE", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
  const yesterday = zonedParts(new Date(now.getTime() - 86_400_000), timeZone);
  if (day.year === today.year && day.month === today.month && day.day === today.day) return `Hoy, ${time}`;
  if (day.year === yesterday.year && day.month === yesterday.month && day.day === yesterday.day) return `Ayer, ${time}`;
  return new Intl.DateTimeFormat("es-PE", { timeZone, day: "numeric", month: "short" }).format(date) + `, ${time}`;
}

export function buildDashboard(input: {
  transactions: TransactionWithCategory[];
  previous: TransactionWithCategory[];
  budgets: Views<"budget_progress">[];
  month: MonthRef;
  isCurrentMonth: boolean;
  currency: string;
  timeZone: string;
  now?: Date;
}): DashboardData {
  const now = input.now ?? new Date();
  const { currency, timeZone, month } = input;
  const counted = input.transactions.filter((transaction) => transaction.status !== "ignored");
  const currencies = [...new Set(counted.map((transaction) => transaction.currency))];
  if (!currencies.includes(currency)) currencies.unshift(currency);

  const inCurrency = counted.filter((transaction) => transaction.currency === currency);
  const expenses = inCurrency.filter((transaction) => transaction.type === "expense");
  const total = round(expenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0));
  const income = round(
    inCurrency.filter((transaction) => transaction.type === "income").reduce((sum, t) => sum + Number(t.amount), 0),
  );

  // Días transcurridos del periodo (para promedios y comparación justa con el mes anterior).
  const daysInMonth = new Date(Date.UTC(month.year, month.month, 0)).getUTCDate();
  const todayParts = zonedParts(now, timeZone);
  const elapsedDays = input.isCurrentMonth ? todayParts.day : daysInMonth;

  const previousExpenses = input.previous.filter(
    (transaction) => transaction.status !== "ignored" && transaction.currency === currency && transaction.type === "expense",
  );
  const previousSamePeriod = previousExpenses
    .filter((transaction) => zonedParts(new Date(transaction.occurred_at), timeZone).day <= elapsedDays)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const changeVsPrevious = previousSamePeriod > 0 ? (total - previousSamePeriod) / previousSamePeriod : null;

  // Gasto por día y "Gasté hoy".
  const daily = Array.from({ length: daysInMonth }, () => 0);
  for (const transaction of expenses) daily[zonedParts(new Date(transaction.occurred_at), timeZone).day - 1] += Number(transaction.amount);
  const todayExpenses = input.isCurrentMonth
    ? expenses.filter((transaction) => zonedParts(new Date(transaction.occurred_at), timeZone).day === todayParts.day)
    : [];
  const biggestToday = [...(todayExpenses.length ? todayExpenses : expenses)].sort((a, b) => Number(b.amount) - Number(a.amount))[0];

  // Fuentes (banco/tarjeta) y cuentas.
  const sourceTotals = new Map<string, number>();
  for (const transaction of expenses) {
    const label = sourceLabel(transaction);
    sourceTotals.set(label, (sourceTotals.get(label) ?? 0) + Number(transaction.amount));
  }
  const sources = [...sourceTotals.entries()]
    .map(([label, amount]) => ({ label, amount: round(amount), share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Solo bancos/tarjetas reales (no "Correo", "WhatsApp" ni "Efectivo").
  const GENERIC_SOURCES = new Set(["Correo", "WhatsApp", "Efectivo / manual"]);
  const accounts = sources.filter((source) => !GENERIC_SOURCES.has(source.label)).slice(0, 4).map((source) => ({
    label: source.label,
    kind: /··/.test(source.label) ? "Tarjeta" : source.label === "Yape" || source.label === "Plin" ? "Billetera digital" : "Cuenta",
    amount: source.amount,
  }));

  // Presupuesto total del mes (y las 2 categorías más cargadas).
  const budgetsInCurrency = input.budgets.filter((budget) => budget.currency === currency);
  const overall = budgetsInCurrency.find((budget) => budget.category_id === null);
  const categoryBudgets = budgetsInCurrency
    .filter((budget) => budget.category_id !== null)
    .sort((a, b) => Number(b.ratio) - Number(a.ratio))
    .slice(0, 2)
    .map((budget) => ({ label: `${budget.category_emoji ?? ""} ${budget.category_name}`.trim(), ratio: Number(budget.ratio) }));
  const budget = overall
    ? {
        amount: Number(overall.budget_amount),
        spent: Number(overall.spent),
        ratio: Number(overall.ratio),
        remaining: Number(overall.remaining),
        categories: categoryBudgets,
      }
    : categoryBudgets.length
      ? { amount: 0, spent: 0, ratio: 0, remaining: 0, categories: categoryBudgets }
      : null;

  // Actividad reciente.
  const activity: ActivityItem[] = input.transactions.slice(0, 8).map((transaction) => ({
    id: transaction.id,
    title: transaction.merchant ?? transaction.description ?? (transaction.type === "income" ? "Ingreso" : "Gasto"),
    subtitle: [transaction.categories?.name ?? "Sin categoría", sourceLabel(transaction)].join(" · "),
    emoji: transaction.categories?.emoji ?? (transaction.status === "pending" ? "⏳" : "💳"),
    color: transaction.categories?.color ?? (transaction.status === "pending" ? "#f59e0b" : FALLBACK_COLOR),
    amount: Number(transaction.amount),
    currency: transaction.currency,
    type: transaction.type,
    when: relativeWhen(transaction.occurred_at, timeZone, now),
    pending: transaction.status === "pending",
  }));

  // Principales comercios.
  const merchantMap = new Map<string, { name: string; count: number; amount: number; emoji: string; color: string }>();
  for (const transaction of expenses) {
    const name = transaction.merchant?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = merchantMap.get(key) ?? {
      name,
      count: 0,
      amount: 0,
      emoji: transaction.categories?.emoji ?? "🛍️",
      color: transaction.categories?.color ?? FALLBACK_COLOR,
    };
    entry.count += 1;
    entry.amount += Number(transaction.amount);
    merchantMap.set(key, entry);
  }
  const merchants = [...merchantMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((merchant) => ({ ...merchant, amount: round(merchant.amount), share: total > 0 ? merchant.amount / total : 0 }));

  // Insights calculados con tus datos.
  const insights: Insight[] = [];
  if (changeVsPrevious !== null && Math.abs(changeVsPrevious) >= 0.05) {
    const up = changeVsPrevious > 0;
    insights.push({
      tone: up ? "up" : "down",
      title: up
        ? `Gastaste ${Math.round(changeVsPrevious * 100)}% más`
        : `Ahorraste ${formatMoney(previousSamePeriod - total, currency)}`,
      tag: "Total",
      detail: "vs. el mes pasado a esta fecha",
    });
  }

  const categoryNow = new Map<string, { label: string; amount: number }>();
  const categoryBefore = new Map<string, number>();
  for (const transaction of expenses) {
    if (!transaction.categories) continue;
    const entry = categoryNow.get(transaction.categories.id) ?? {
      label: `${transaction.categories.emoji ?? ""} ${transaction.categories.name}`.trim(),
      amount: 0,
    };
    entry.amount += Number(transaction.amount);
    categoryNow.set(transaction.categories.id, entry);
  }
  for (const transaction of previousExpenses) {
    if (!transaction.categories) continue;
    if (zonedParts(new Date(transaction.occurred_at), timeZone).day > elapsedDays) continue;
    categoryBefore.set(transaction.categories.id, (categoryBefore.get(transaction.categories.id) ?? 0) + Number(transaction.amount));
  }
  const growth = [...categoryNow.entries()]
    .map(([id, entry]) => ({ ...entry, before: categoryBefore.get(id) ?? 0 }))
    .filter((entry) => entry.before > 0 && entry.amount - entry.before >= 20)
    .sort((a, b) => (b.amount - b.before) / b.before - (a.amount - a.before) / a.before)[0];
  if (growth) {
    insights.push({
      tone: "warning",
      title: `Más gasto en ${growth.label}`,
      tag: "Categoría",
      detail: `${formatMoney(growth.amount, currency)} este mes`,
      note: `+${Math.round(((growth.amount - growth.before) / growth.before) * 100)}% vs. el mes pasado`,
    });
  }

  if (merchants[0] && merchants[0].count >= 2) {
    insights.push({
      tone: "info",
      title: `${merchants[0].name} es tu comercio #1`,
      tag: "Comercio",
      detail: `${merchants[0].count} compras · ${formatMoney(merchants[0].amount, currency)}`,
    });
  }

  if (input.isCurrentMonth && elapsedDays >= 3 && elapsedDays < daysInMonth && total > 0) {
    const projection = (total / elapsedDays) * daysInMonth;
    const previousTotal = previousExpenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    insights.push({
      tone: "info",
      title: `Gastarás ${formatMoney(projection, currency)}`,
      tag: "Proyección",
      detail: "a fin de mes a tu ritmo actual",
      note:
        previousTotal > 0
          ? `${formatMoney(Math.abs(previousTotal - projection), currency)} ${projection <= previousTotal ? "menos" : "más"} que el mes pasado`
          : undefined,
    });
  }

  return {
    currency,
    currencies,
    total,
    income,
    changeVsPrevious,
    today: {
      amount: round(todayExpenses.reduce((sum, transaction) => sum + Number(transaction.amount), 0)),
      avgPerDay: elapsedDays > 0 ? round(total / elapsedDays) : 0,
      biggest: biggestToday
        ? { name: biggestToday.merchant ?? "Sin nombre", amount: Number(biggestToday.amount) }
        : null,
      spark: daily.slice(0, Math.max(elapsedDays, 2)).map(round),
    },
    sources,
    budget,
    activity,
    merchants,
    accounts,
    insights: insights.slice(0, 4),
    pendingCount: input.transactions.filter((transaction) => transaction.status === "pending").length,
  };
}
