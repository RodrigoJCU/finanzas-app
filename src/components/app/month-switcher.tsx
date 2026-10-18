import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui";

export function MonthSwitcher({
  basePath,
  label,
  previous,
  next,
  canGoNext,
}: {
  basePath: string;
  label: string;
  previous: string;
  next: string;
  canGoNext: boolean;
}) {
  const arrow =
    "grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
      <Link href={`${basePath}?mes=${previous}`} className={arrow} aria-label="Mes anterior">
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-32 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      {canGoNext ? (
        <Link href={`${basePath}?mes=${next}`} className={arrow} aria-label="Mes siguiente">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(arrow, "pointer-events-none opacity-30")} aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
