import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { Views } from "@/types/database";

// Estado del presupuesto: color + ícono + texto (nunca solo color).
export function budgetState(ratio: number, threshold: number) {
  if (ratio >= 1) return { label: "Superado", bar: "bg-rose-500", text: "text-rose-700 dark:text-rose-400", Icon: XCircle };
  if (ratio >= threshold)
    return { label: "Cerca del límite", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", Icon: AlertTriangle };
  return { label: "En orden", bar: "bg-brand-600", text: "text-brand-700 dark:text-brand-400", Icon: CheckCircle2 };
}

export function BudgetBar({ budget }: { budget: Views<"budget_progress"> }) {
  const ratio = Number(budget.ratio);
  const state = budgetState(ratio, Number(budget.alert_threshold));
  const name = budget.category_id ? `${budget.category_emoji ?? ""} ${budget.category_name}`.trim() : "Total del mes";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-800 dark:text-slate-100">{name}</span>
        <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
          {formatMoney(Number(budget.spent), budget.currency)} / {formatMoney(Number(budget.budget_amount), budget.currency)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-2.5 rounded-full ${state.bar}`} style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%` }} />
      </div>
      <p className={`mt-1 flex items-center gap-1 text-xs ${state.text}`}>
        <state.Icon className="h-3.5 w-3.5" aria-hidden />
        {state.label} · {Math.round(ratio * 100)}%
        {Number(budget.remaining) > 0 && (
          <span className="text-slate-500 dark:text-slate-400">
            · quedan {formatMoney(Number(budget.remaining), budget.currency)}
          </span>
        )}
      </p>
    </div>
  );
}
