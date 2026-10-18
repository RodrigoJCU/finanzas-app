import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardView, HeroChip } from "@/components/dashboard/dashboard-view";
import { TransactionRow } from "@/components/app/transaction-row";
import { Alert, Card } from "@/components/ui";
import { requireAccess } from "@/lib/auth";
import { buildDashboard } from "@/lib/finance/dashboard";
import { getCategories, getMonthTransactions, isCurrentMonth, resolveMonth, shiftMonth } from "@/lib/finance/month";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resumen" };

const CURRENCY_LABEL: Record<string, string> = { PEN: "S/ PEN", USD: "US$ USD" };

export default async function DashboardPage({ searchParams }: PageProps<"/app">) {
  const params = await searchParams;
  const { profile } = await requireAccess();
  const month = resolveMonth(params.mes, profile.timezone);
  const previousMonth = resolveMonth(shiftMonth(month, -1), profile.timezone);
  const current = isCurrentMonth(month, profile.timezone);

  const supabase = await createClient();
  const [transactions, previous, categories, { data: budgets }] = await Promise.all([
    getMonthTransactions(month, profile.timezone),
    getMonthTransactions(previousMonth, profile.timezone),
    getCategories(),
    supabase.from("budget_progress").select("*"),
  ]);

  const requested = typeof params.moneda === "string" && /^[A-Z]{3}$/.test(params.moneda) ? params.moneda : null;
  const usedCurrencies = new Set(transactions.map((transaction) => transaction.currency));
  const currency =
    requested ?? (usedCurrencies.has(profile.currency) || usedCurrencies.size === 0 ? profile.currency : [...usedCurrencies][0]);

  const data = buildDashboard({
    transactions,
    previous,
    budgets: budgets ?? [],
    month,
    isCurrentMonth: current,
    currency,
    timeZone: profile.timezone,
  });
  const pending = transactions.filter((transaction) => transaction.status === "pending");
  const firstName = profile.full_name?.split(" ")[0];
  const href = (changes: { mes?: string; moneda?: string }) => {
    const query = new URLSearchParams({ mes: changes.mes ?? month.key, moneda: changes.moneda ?? currency });
    return `/app?${query.toString()}`;
  };

  const steps = [
    { done: Boolean(profile.whatsapp_phone), label: "Vincula tu WhatsApp", href: "/app/ajustes#whatsapp" },
    { done: Boolean(profile.last_email_received_at), label: "Reenvía los correos de tu banco", href: "/app/ajustes#correo" },
    { done: Boolean(budgets?.length), label: "Crea tu primer presupuesto", href: "/app/presupuestos" },
  ];

  return (
    <>
      {params.clave === "actualizada" && (
        <div className="mb-4">
          <Alert tone="success">Tu contraseña se actualizó correctamente.</Alert>
        </div>
      )}
      {params.pago === "ok" && (
        <div className="mb-4">
          <Alert tone="success">¡Gracias! Tu suscripción está activa.</Alert>
        </div>
      )}

      {!steps.every((step) => step.done) && (
        <Card className="mb-6">
          <h2 className="font-semibold text-ink dark:text-white">Configura tu cuenta</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Completa estos pasos para que tus gastos se registren solos.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm hover:border-brand-200 hover:bg-brand-50 dark:border-slate-800"
                >
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" aria-label="Completado" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" aria-label="Pendiente" />
                  )}
                  <span className={step.done ? "text-slate-400 line-through" : "font-medium text-ink dark:text-slate-100"}>
                    {step.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <DashboardView
        data={data}
        greeting={firstName ? `Hola, ${firstName}` : "Hola"}
        links={{ activity: `/app/movimientos?mes=${month.key}`, budgets: "/app/presupuestos" }}
        controls={
          <>
            <HeroChip href={href({ mes: shiftMonth(month, -1) })}>
              <ChevronLeft className="h-4 w-4" aria-label="Mes anterior" />
            </HeroChip>
            <HeroChip>
              <Calendar className="h-4 w-4" aria-hidden />
              {current ? "Este mes" : month.label}
            </HeroChip>
            {!current && (
              <HeroChip href={href({ mes: shiftMonth(month, 1) })}>
                <ChevronRight className="h-4 w-4" aria-label="Mes siguiente" />
              </HeroChip>
            )}
            {data.currencies.length > 1 &&
              data.currencies.map((code) => (
                <HeroChip key={code} href={href({ moneda: code })} active={code === currency}>
                  {CURRENCY_LABEL[code] ?? code}
                </HeroChip>
              ))}
          </>
        }
        pendingSlot={
          pending.length > 0 ? (
            <Card className="mt-6 border-amber-200 dark:border-amber-900">
              <h2 className="font-semibold text-ink dark:text-white">⏳ Por categorizar ({pending.length})</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Elige una categoría o respóndele al bot por WhatsApp.</p>
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {pending.slice(0, 10).map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                    timeZone={profile.timezone}
                  />
                ))}
              </ul>
            </Card>
          ) : null
        }
      />
    </>
  );
}
