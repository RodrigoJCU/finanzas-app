import type { Metadata } from "next";
import { saveBudget } from "@/app/app/actions";
import { ActionForm } from "@/components/app/action-form";
import { BudgetList } from "@/components/app/budget-list";
import { Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { requireAccess } from "@/lib/auth";
import { getCategories } from "@/lib/finance/month";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Presupuestos" };

export default async function BudgetsPage() {
  const { profile } = await requireAccess();
  const supabase = await createClient();
  const [{ data: budgets }, categories] = await Promise.all([
    supabase.from("budget_progress").select("*").order("category_name", { nullsFirst: true }),
    getCategories(),
  ]);
  const expenseCategories = categories.filter((category) => category.kind === "expense" && !category.is_archived);

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description={`Límites mensuales en ${profile.currency}. Te avisamos por WhatsApp al acercarte.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Este mes</h2>
          {budgets?.length ? (
            <BudgetList budgets={budgets} />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aún no tienes presupuestos. Crea el primero con el formulario.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold text-slate-900 dark:text-white">Nuevo o editar</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Si eliges una categoría que ya tiene presupuesto, se actualiza.
          </p>
          <ActionForm action={saveBudget} submitLabel="Guardar presupuesto">
            <div>
              <Label htmlFor="categoryId">Categoría</Label>
              <Select id="categoryId" name="categoryId" defaultValue="">
                <option value="">💰 Total del mes (todas)</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji ? `${category.emoji} ` : ""}
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Límite mensual ({profile.currency})</Label>
              <Input id="amount" name="amount" type="number" inputMode="decimal" step="0.01" min="1" required placeholder="500.00" />
            </div>
            <div>
              <Label htmlFor="alertThreshold">Avisarme al llegar al</Label>
              <Select id="alertThreshold" name="alertThreshold" defaultValue="80">
                <option value="50">50%</option>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
                <option value="100">100%</option>
              </Select>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
