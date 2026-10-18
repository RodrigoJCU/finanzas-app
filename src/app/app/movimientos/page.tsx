import type { Metadata } from "next";
import { MonthSwitcher } from "@/components/app/month-switcher";
import { NewTransactionForm } from "@/components/app/new-transaction-form";
import { TransactionRow } from "@/components/app/transaction-row";
import { Card, PageHeader } from "@/components/ui";
import { requireAccess } from "@/lib/auth";
import { getCategories, getMonthTransactions, isCurrentMonth, resolveMonth, shiftMonth } from "@/lib/finance/month";
import { formatLocal } from "@/lib/time";

export const metadata: Metadata = { title: "Movimientos" };

const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Por categorizar" },
  { value: "gastos", label: "Gastos" },
  { value: "ingresos", label: "Ingresos" },
] as const;

export default async function TransactionsPage({ searchParams }: PageProps<"/app/movimientos">) {
  const params = await searchParams;
  const { profile } = await requireAccess();
  const month = resolveMonth(params.mes, profile.timezone);
  const filter = FILTERS.find((item) => item.value === params.ver)?.value ?? "todos";

  const [transactions, categories] = await Promise.all([getMonthTransactions(month, profile.timezone), getCategories()]);
  const visible = transactions.filter((transaction) => {
    if (filter === "pendientes") return transaction.status === "pending";
    if (filter === "gastos") return transaction.type === "expense";
    if (filter === "ingresos") return transaction.type === "income";
    return true;
  });

  // Agrupa por día (en la zona horaria del usuario).
  const dayFormatter = new Intl.DateTimeFormat("es-PE", {
    timeZone: profile.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const groups = new Map<string, typeof visible>();
  for (const transaction of visible) {
    const key = dayFormatter.format(new Date(transaction.occurred_at));
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Todo lo que entró y salió este mes."
        action={
          <MonthSwitcher
            basePath="/app/movimientos"
            label={month.label}
            previous={shiftMonth(month, -1)}
            next={shiftMonth(month, 1)}
            canGoNext={!isCurrentMonth(month, profile.timezone)}
          />
        }
      />

      <Card className="mb-6">
        <details id="nuevo">
          <summary className="cursor-pointer font-semibold text-slate-900 dark:text-white">➕ Registrar un movimiento</summary>
          <div className="mt-4">
            <NewTransactionForm
              categories={categories}
              defaultCurrency={profile.currency}
              nowLocal={formatLocal(new Date(), profile.timezone).replace(" ", "T")}
            />
          </div>
        </details>
      </Card>

      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtros">
        {FILTERS.map((item) => (
          <a
            key={item.value}
            href={`/app/movimientos?mes=${month.key}&ver=${item.value}`}
            className={
              item.value === filter
                ? "rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
                : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }
          >
            {item.label}
          </a>
        ))}
      </nav>

      {groups.size === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No hay movimientos para mostrar.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([day, items]) => (
            <Card key={day} className="py-2">
              <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{day}</h2>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categories={categories}
                    timeZone={profile.timezone}
                    allowDelete
                  />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
