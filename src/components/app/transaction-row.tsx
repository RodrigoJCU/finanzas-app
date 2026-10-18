"use client";

import { Ban, Mail, MessageCircle, PenLine, RotateCcw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteTransaction, setTransactionCategory, setTransactionIgnored } from "@/app/app/actions";
import { cn } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { TransactionWithCategory } from "@/lib/finance/month";
import type { Tables } from "@/types/database";

const SOURCE_ICON = { email: Mail, whatsapp: MessageCircle, manual: PenLine };
const SOURCE_LABEL = { email: "Correo", whatsapp: "WhatsApp", manual: "Manual" };

export function TransactionRow({
  transaction,
  categories,
  timeZone,
  allowDelete = false,
}: {
  transaction: TransactionWithCategory;
  categories: Tables<"categories">[];
  timeZone: string;
  allowDelete?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const SourceIcon = SOURCE_ICON[transaction.source];
  const isIncome = transaction.type === "income";
  const ignored = transaction.status === "ignored";
  const options = categories.filter(
    (category) => category.kind === transaction.type && (!category.is_archived || category.id === transaction.category_id),
  );

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Error");
    });

  const date = new Intl.DateTimeFormat("es-PE", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(transaction.occurred_at));

  return (
    // Móvil: 2 filas (nombre + monto / categoría + acciones). Escritorio: una sola fila.
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:flex",
        pending && "opacity-60",
        ignored && "opacity-50",
      )}
    >
      <div className="min-w-0 sm:order-1 sm:flex-1">
        <p className={cn("truncate text-sm font-medium text-slate-900 dark:text-slate-100", ignored && "line-through")}>
          {transaction.merchant ?? transaction.description ?? (isIncome ? "Ingreso" : "Gasto")}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <SourceIcon className="h-3.5 w-3.5 shrink-0" aria-label={SOURCE_LABEL[transaction.source]} />
          <span className="whitespace-nowrap">{date}</span>
          {transaction.bank_name && <span>· {transaction.bank_name}</span>}
          {transaction.card_last4 && <span>•{transaction.card_last4}</span>}
          {transaction.user_note && <span className="truncate">· {transaction.user_note}</span>}
        </p>
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>

      <p
        className={cn(
          "text-right text-sm font-semibold whitespace-nowrap tabular-nums sm:order-3 sm:w-28",
          isIncome ? "text-brand-700 dark:text-brand-400" : "text-slate-900 dark:text-slate-100",
        )}
      >
        {isIncome ? "+" : "−"}
        {formatMoney(Number(transaction.amount), transaction.currency)}
      </p>

      <select
        aria-label="Categoría"
        disabled={pending || ignored}
        value={transaction.category_id ?? ""}
        onChange={(event) => run(() => setTransactionCategory(transaction.id, event.target.value || null))}
        className={cn(
          "w-full rounded-lg border px-2 py-1.5 text-xs sm:order-2 sm:w-44 dark:bg-slate-900",
          transaction.status === "pending"
            ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:text-amber-200"
            : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:text-slate-200",
        )}
      >
        <option value="">⏳ Sin categoría</option>
        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.emoji ? `${category.emoji} ` : ""}
            {category.name}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-end gap-1 sm:order-4">
        <button
          type="button"
          title={ignored ? "Volver a contar" : "No contar (ej. transferencia entre tus cuentas)"}
          aria-label={ignored ? "Volver a contar" : "No contar"}
          disabled={pending}
          onClick={() => run(() => setTransactionIgnored(transaction.id, !ignored))}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {ignored ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
        </button>
        {allowDelete && (
          <button
            type="button"
            title="Eliminar"
            aria-label="Eliminar"
            disabled={pending}
            onClick={() => {
              if (confirm("¿Eliminar este movimiento?")) run(() => deleteTransaction(transaction.id));
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}
