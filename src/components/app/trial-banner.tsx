import Link from "next/link";
import { daysUntil } from "@/lib/time";

export function TrialBanner({ trialEndsAt }: { trialEndsAt: string }) {
  const days = daysUntil(trialEndsAt);
  return (
    <div className="border-b border-brand-200 bg-brand-50 px-4 py-2 text-center text-sm text-brand-900 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
      {days <= 1 ? "Tu prueba gratis termina hoy." : `Te quedan ${days} días de prueba gratis.`}{" "}
      <Link href="/suscripcion" className="font-semibold underline">
        Suscríbete
      </Link>
    </div>
  );
}
