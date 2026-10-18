"use client";

import { useState } from "react";
import { createManualTransaction } from "@/app/app/actions";
import { ActionForm } from "@/components/app/action-form";
import { Input, Label, Select } from "@/components/ui";
import type { Tables } from "@/types/database";

export function NewTransactionForm({
  categories,
  defaultCurrency,
  nowLocal,
}: {
  categories: Tables<"categories">[];
  defaultCurrency: string;
  nowLocal: string;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const options = categories.filter((category) => category.kind === type && !category.is_archived);

  return (
    <ActionForm action={createManualTransaction} submitLabel="Registrar">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" name="type" value={type} onChange={(event) => setType(event.target.value as "expense" | "income")}>
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </Select>
        </div>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <Label htmlFor="amount">Monto</Label>
            <Input id="amount" name="amount" type="number" inputMode="decimal" step="0.01" min="0.01" required placeholder="0.00" />
          </div>
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <Select id="currency" name="currency" defaultValue={defaultCurrency}>
              <option value="PEN">S/</option>
              <option value="USD">US$</option>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="merchant">Descripción</Label>
          <Input id="merchant" name="merchant" maxLength={200} placeholder="Ej. Almuerzo, taxi, sueldo" />
        </div>
        <div>
          <Label htmlFor="categoryId">Categoría</Label>
          <Select id="categoryId" name="categoryId" defaultValue="" key={type}>
            <option value="">Sin categoría</option>
            {options.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji ? `${category.emoji} ` : ""}
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="occurredAt">Fecha y hora</Label>
          <Input id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={nowLocal} />
        </div>
      </div>
    </ActionForm>
  );
}
