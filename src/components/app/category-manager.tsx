"use client";

import { useTransition } from "react";
import { createCategory, setCategoryArchived } from "@/app/app/actions";
import { ActionForm } from "@/components/app/action-form";
import { Input, Label, Select, cn } from "@/components/ui";
import type { Tables } from "@/types/database";

export function CategoryManager({ categories }: { categories: Tables<"categories">[] }) {
  const [pending, startTransition] = useTransition();
  const groups = [
    { kind: "expense", title: "Gastos" },
    { kind: "income", title: "Ingresos" },
  ] as const;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.kind}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {group.title}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {categories
              .filter((category) => category.kind === group.kind)
              .map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    disabled={pending}
                    title={category.is_archived ? "Activar" : "Ocultar"}
                    onClick={() =>
                      startTransition(async () => void (await setCategoryArchived(category.id, !category.is_archived)))
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      category.is_archived
                        ? "border-dashed border-slate-300 text-slate-400 line-through dark:border-slate-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
                    )}
                  >
                    {category.emoji ? `${category.emoji} ` : ""}
                    {category.name}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Toca una categoría para ocultarla o volver a activarla. Las ocultas no aparecen en WhatsApp.
      </p>

      <ActionForm action={createCategory} submitLabel="Agregar categoría" className="grid gap-3 sm:grid-cols-[5rem_1fr_9rem_auto] sm:items-end">
        <div>
          <Label htmlFor="emoji">Emoji</Label>
          <Input id="emoji" name="emoji" maxLength={8} placeholder="🎮" />
        </div>
        <div>
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" maxLength={40} required placeholder="Ej. Videojuegos" />
        </div>
        <div>
          <Label htmlFor="kind">Tipo</Label>
          <Select id="kind" name="kind" defaultValue="expense">
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </Select>
        </div>
      </ActionForm>
    </div>
  );
}
