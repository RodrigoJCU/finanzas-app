import { Brain, LineChart, MessageCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui";
import { PLAN_FEATURES, PLANS, TRIAL_DAYS, type PlanId } from "@/lib/plans";

const FEATURE_ICON = { brain: Brain, chart: LineChart, chat: MessageCircle, alert: TriangleAlert };

export function PlanCard({ plan, highlighted, action }: { plan: PlanId; highlighted?: boolean; action: React.ReactNode }) {
  const info = PLANS[plan];
  return (
    <div
      className={cn(
        "flex w-full max-w-xs flex-col items-center rounded-3xl border bg-white px-8 py-8 text-center",
        highlighted
          ? "border-brand-400 bg-gradient-to-b from-brand-50 to-white shadow-[0_20px_50px_rgba(61,174,86,0.18)] md:-mt-4"
          : "border-black/10",
      )}
    >
      <p className={cn("flex items-center gap-3 font-semibold", highlighted ? "text-brand-600" : "text-ink")}>
        <span className="h-px w-8 bg-current opacity-30" aria-hidden />
        {info.name}
        <span className="h-px w-8 bg-current opacity-30" aria-hidden />
      </p>
      <p className={cn("mt-4 text-6xl font-extrabold tracking-tight", highlighted ? "text-brand-800" : "text-ink")}>
        GRATIS
      </p>
      <p className={cn("mt-1 text-xl", highlighted ? "text-brand-600" : "text-slate-400")}>
        por <strong className={highlighted ? "text-brand-700" : "text-ink"}>{TRIAL_DAYS} días</strong>
      </p>
      {info.badge && <p className="mt-2 text-xs font-bold text-brand-500">{info.badge}</p>}
      <p className="mt-5 text-sm">
        <strong className="text-ink">Después {info.perMonth}</strong> <span className="text-slate-400">/mes</span>
      </p>
      <p className="h-5 text-xs text-slate-400">{info.billed ?? ""}</p>
      <p className="mt-4 font-hand text-xl font-bold text-brand-600">¡Sin tarjeta para empezar!</p>
      <div className="mt-5 w-full">{action}</div>
    </div>
  );
}

export function Pricing() {
  return (
    <>
      <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:items-start">
        {(["monthly", "annual"] as const).map((plan) => (
          <PlanCard
            key={plan}
            plan={plan}
            highlighted={plan === "annual"}
            action={
              <Link
                href="/registro"
                className={cn(
                  "block w-full rounded-full py-3 text-center font-semibold transition-colors",
                  plan === "annual" ? "bg-brand-800 text-white hover:bg-brand-900" : "bg-ink text-white hover:bg-black",
                )}
              >
                Comienza ahora
              </Link>
            }
          />
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-md text-center text-xs text-slate-400">
        Al terminar la prueba eliges tu plan. Si no te suscribes, no se te cobra nada.
      </p>

      <div className="mx-auto mt-12 max-w-3xl rounded-3xl bg-white px-6 py-8 shadow-[0_2px_14px_rgba(16,24,20,0.06)]">
        <p className="text-center text-lg text-ink">
          Tu plan <span className="font-semibold text-brand-500">además</span> incluye
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
          {PLAN_FEATURES.map((feature) => {
            const Icon = FEATURE_ICON[feature.icon];
            return (
              <li key={feature.title} className="flex flex-col items-center gap-3 text-center text-slate-600">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-100 text-brand-600">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                {feature.title}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
