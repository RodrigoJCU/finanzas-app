import { ArrowDownRight, ArrowUpRight, ChevronRight, CreditCard, Landmark, Lightbulb, Smartphone, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";
import type { DashboardData, Insight } from "@/lib/finance/dashboard";
import { formatMoney } from "@/lib/money";

// Vista del dashboard al estilo "tarjeta verde + tarjetas flotantes". Sirve para datos reales y para la demo.

const card = "rounded-2xl border border-black/5 bg-white shadow-[0_2px_14px_rgba(16,24,20,0.06)] dark:border-white/10 dark:bg-slate-900";

export function BigMoney({ amount, currency, className }: { amount: number; currency: string; className?: string }) {
  const [whole, cents] = formatMoney(amount, currency).split(".");
  return (
    <span className={cn("font-bold tracking-tight tabular-nums", className)}>
      {whole}
      <span className="opacity-50">.{cents}</span>
    </span>
  );
}

export function CategoryIcon({ emoji, color, size = "md" }: { emoji: string; color: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full", size === "md" ? "h-11 w-11 text-lg" : "h-9 w-9 text-base")}
      style={{ backgroundColor: `${color}22` }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 200;
  const height = 48;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => [index * step, height - 4 - (value / max) * (height - 10)]);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full text-brand-500" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Bar({ ratio, className }: { ratio: number; className: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={cn("h-2 rounded-full", className)} style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%` }} />
    </div>
  );
}

const budgetColor = (ratio: number) => (ratio >= 1 ? "bg-rose-500" : ratio >= 0.8 ? "bg-orange-500" : "bg-brand-500");

function SectionTitle({ title, href, linkLabel = "Ver todo" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-ink dark:text-white">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          {linkLabel}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

const INSIGHT_STYLE: Record<Insight["tone"], { icon: typeof TrendingUp; circle: string; tag: string; note: string }> = {
  up: { icon: TrendingUp, circle: "bg-orange-100 text-orange-600", tag: "text-orange-600", note: "text-brand-600" },
  down: { icon: TrendingDown, circle: "bg-purple-100 text-purple-600", tag: "text-purple-600", note: "text-brand-600" },
  warning: { icon: TrendingUp, circle: "bg-brand-100 text-brand-700", tag: "text-brand-600", note: "text-brand-600" },
  info: { icon: Lightbulb, circle: "bg-blue-100 text-blue-600", tag: "text-blue-600", note: "text-blue-600" },
};

export function DashboardView({
  data,
  greeting,
  controls,
  links,
  pendingSlot,
}: {
  data: DashboardData;
  greeting: string;
  controls?: ReactNode;
  links?: { activity?: string; budgets?: string };
  pendingSlot?: ReactNode;
}) {
  const change = data.changeVsPrevious;
  const budget = data.budget;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {/* Tarjeta verde principal */}
          <section className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-5 pb-20 pt-5 text-white sm:px-7">
            {controls && <div className="flex flex-wrap gap-2">{controls}</div>}
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold">{greeting}</p>
              <p className="mt-1 text-sm text-white/70">Gastos del periodo</p>
              <p className="mt-1 text-5xl sm:text-6xl">
                <BigMoney amount={data.total} currency={data.currency} />
              </p>
              {change !== null && (
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-white/80">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
                    {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {Math.abs(Math.round(change * 100))}%
                  </span>
                  frente al periodo anterior
                </p>
              )}
            </div>
          </section>

          {/* Tarjetas flotantes */}
          <div className="relative -mt-14 grid gap-3 px-2 sm:grid-cols-3 sm:px-3">
            <div className={cn(card, "p-4")}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Gasté hoy</p>
              <p className="mt-1 text-2xl">
                <BigMoney amount={data.today.amount} currency={data.currency} className="text-ink dark:text-white" />
              </p>
              <p className="text-xs text-slate-400">Promedio {formatMoney(data.today.avgPerDay, data.currency)} al día</p>
              {data.today.biggest && (
                <div className="mt-3 text-xs">
                  <p className="text-slate-400">Mayor gasto</p>
                  <p className="flex justify-between gap-2 font-medium text-ink dark:text-slate-100">
                    <span className="truncate">{data.today.biggest.name}</span>
                    <span className="tabular-nums">{formatMoney(data.today.biggest.amount, data.currency)}</span>
                  </p>
                </div>
              )}
              <div className="mt-2">
                <Sparkline values={data.today.spark} />
              </div>
            </div>

            <div className={cn(card, "p-4")}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Mayor fuente de gasto</p>
              {data.sources[0] ? (
                <>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-ink dark:text-white">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950">
                      <CreditCard className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="truncate">{data.sources[0].label}</span>
                  </p>
                  <p className="mt-2 text-xl">
                    <BigMoney amount={data.sources[0].amount} currency={data.currency} className="text-ink dark:text-white" />
                    <span className="ml-1.5 text-sm text-slate-400">{Math.round(data.sources[0].share * 100)}%</span>
                  </p>
                  <ul className="mt-3 space-y-2">
                    {data.sources.slice(0, 3).map((source, index) => (
                      <li key={source.label} className="text-xs">
                        <p className="mb-1 flex justify-between text-slate-600 dark:text-slate-300">
                          <span className="truncate">{source.label}</span>
                          <span>{Math.round(source.share * 100)}%</span>
                        </p>
                        <Bar ratio={source.share} className={index === 0 ? "bg-brand-500" : "bg-brand-300"} />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Aún no hay gastos este periodo.</p>
              )}
            </div>

            <div className={cn(card, "p-4")}>
              <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Presupuesto del mes</span>
                {budget && budget.amount > 0 && (
                  <span className="font-semibold text-ink dark:text-white">{Math.round(budget.ratio * 100)}%</span>
                )}
              </div>
              {budget ? (
                <>
                  {budget.amount > 0 && (
                    <>
                      <p className="mt-1 text-2xl">
                        <BigMoney amount={budget.amount} currency={data.currency} className="text-ink dark:text-white" />
                      </p>
                      <div className="mt-2">
                        <Bar ratio={budget.ratio} className={budgetColor(budget.ratio)} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {budget.remaining >= 0 ? "Te quedan " : "Te pasaste por "}
                        <strong className="text-ink dark:text-white">{formatMoney(Math.abs(budget.remaining), data.currency)}</strong>
                      </p>
                    </>
                  )}
                  <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {budget.categories.map((category) => (
                      <li key={category.label} className="text-xs">
                        <p className="mb-1 flex justify-between text-slate-600 dark:text-slate-300">
                          <span className="truncate">{category.label}</span>
                          <span>{Math.round(category.ratio * 100)}%</span>
                        </p>
                        <Bar ratio={category.ratio} className={budgetColor(category.ratio)} />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  Aún no tienes presupuesto.{" "}
                  {links?.budgets && (
                    <Link href={links.budgets} className="font-medium text-brand-600 underline">
                      Crear uno
                    </Link>
                  )}
                </p>
              )}
            </div>
          </div>

          {pendingSlot}

          {/* Última actividad */}
          <section className="mt-6">
            <SectionTitle title="Última actividad" href={links?.activity} />
            {data.activity.length ? (
              <ul className="space-y-2">
                {data.activity.map((item) => (
                  <li key={item.id} className={cn(card, "flex items-center gap-3 px-4 py-3")}>
                    <CategoryIcon emoji={item.emoji} color={item.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink dark:text-white">{item.title}</p>
                      <p className={cn("truncate text-sm", item.pending ? "text-amber-600" : "text-slate-500 dark:text-slate-400")}>
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-semibold tabular-nums", item.type === "income" ? "text-brand-600" : "text-ink dark:text-white")}>
                        {item.type === "income" ? "+" : ""}
                        {formatMoney(item.amount, item.currency)}
                      </p>
                      <p className="text-xs text-slate-400">{item.when}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn(card, "px-4 py-8 text-center text-sm text-slate-500")}>Aún no hay movimientos este periodo.</p>
            )}
          </section>
        </div>

        {/* Columna derecha */}
        <aside className="space-y-6">
          <section>
            <SectionTitle title="Cuentas y tarjetas" />
            <div className={cn(card, "divide-y divide-slate-100 px-4 dark:divide-slate-800")}>
              {data.accounts.length ? (
                data.accounts.map((account) => {
                  const Icon = account.kind === "Tarjeta" ? CreditCard : account.kind === "Billetera digital" ? Smartphone : account.label.includes("Efectivo") ? Wallet : Landmark;
                  return (
                    <div key={account.label} className="flex items-center gap-3 py-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink dark:text-white">{account.label}</p>
                        <p className="text-xs text-slate-400">{account.kind}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-ink dark:text-white">{formatMoney(account.amount, data.currency)}</p>
                        <p className="text-xs text-slate-400">Gastado</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">Aparecerán cuando lleguen correos de tu banco.</p>
              )}
            </div>
          </section>

          <section>
            <SectionTitle title="Resumen" />
            <div className={cn(card, "grid grid-cols-2 gap-3 p-4")}>
              <div>
                <p className="text-xs text-slate-400">Ingresos</p>
                <p className="font-semibold tabular-nums text-brand-600">{formatMoney(data.income, data.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Balance</p>
                <p className={cn("font-semibold tabular-nums", data.income - data.total < 0 ? "text-rose-600" : "text-ink dark:text-white")}>
                  {formatMoney(data.income - data.total, data.currency)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Por categorizar</p>
                <p className={cn("font-semibold", data.pendingCount ? "text-amber-600" : "text-ink dark:text-white")}>
                  {data.pendingCount ? `${data.pendingCount} movimiento${data.pendingCount === 1 ? "" : "s"}` : "Todo al día ✨"}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cn(card, "p-5")}>
          <h2 className="flex items-center gap-1.5 text-lg font-semibold text-ink dark:text-white">
            Insights <Sparkles className="h-4 w-4 text-purple-400" aria-hidden />
          </h2>
          <p className="mb-4 text-xs text-slate-400">Calculados con tus movimientos</p>
          {data.insights.length ? (
            <ul className="space-y-4">
              {data.insights.map((insight) => {
                const style = INSIGHT_STYLE[insight.tone];
                return (
                  <li key={insight.title} className="flex gap-3">
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", style.circle)}>
                      <style.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink dark:text-white">{insight.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        <span className={cn("font-medium", style.tag)}>{insight.tag}</span> · {insight.detail}
                      </p>
                      {insight.note && <p className={cn("text-sm font-medium", style.note)}>{insight.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Necesitamos algunos días de movimientos para darte insights.</p>
          )}
        </section>

        <section className={cn(card, "p-5")}>
          <h2 className="text-lg font-semibold text-ink dark:text-white">Principales comercios</h2>
          <p className="mb-4 text-xs text-slate-400">Dónde gastaste más este periodo</p>
          {data.merchants.length ? (
            <ul className="space-y-3">
              {data.merchants.map((merchant) => (
                <li key={merchant.name} className="flex items-center gap-3">
                  <CategoryIcon emoji={merchant.emoji} color={merchant.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink dark:text-white">{merchant.name}</p>
                    <p className="text-xs text-slate-400">
                      {merchant.count} consumo{merchant.count === 1 ? "" : "s"} · {Math.round(merchant.share * 100)}% del gasto
                    </p>
                    <div className="mt-1 max-w-40">
                      <Bar ratio={merchant.share} className="bg-brand-400" />
                    </div>
                  </div>
                  <p className="font-semibold tabular-nums text-ink dark:text-white">{formatMoney(merchant.amount, data.currency)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Aún no hay comercios este periodo.</p>
          )}
        </section>
      </div>
    </div>
  );
}

// Botón tipo "chip" para los filtros de la tarjeta verde.
export function HeroChip({ href, children, active }: { href?: string; children: ReactNode; active?: boolean }) {
  const className = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
    active ? "border-white bg-white text-brand-800" : "border-white/30 bg-white/10 text-white hover:bg-white/20",
  );
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}
