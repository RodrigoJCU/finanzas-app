"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteBudget } from "@/app/app/actions";
import { BudgetBar } from "@/components/app/budget-bars";
import type { Views } from "@/types/database";

export function BudgetList({ budgets }: { budgets: Views<"budget_progress">[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <ul className="space-y-5">
      {budgets.map((budget) => (
        <li key={budget.budget_id} className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <BudgetBar budget={budget} />
          </div>
          <button
            type="button"
            aria-label="Eliminar presupuesto"
            title="Eliminar"
            disabled={pending}
            onClick={() => {
              if (confirm("¿Eliminar este presupuesto?")) startTransition(async () => void (await deleteBudget(budget.budget_id)));
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
