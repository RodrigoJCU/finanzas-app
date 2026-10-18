import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { Alert, Button, Card, cn } from "@/components/ui";
import { getAccess, requireSession } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/plans";
import { daysUntil } from "@/lib/time";
import { openBillingPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Suscripción" };

const FEATURES = [
  "Registro automático de gastos desde los correos de tu banco",
  "Categorización por WhatsApp con texto o notas de voz",
  "Inteligencia artificial que entiende cómo hablas",
  "Presupuestos con alertas por WhatsApp",
  "Dashboard con gráficos, instalable en tu celular",
];

export default async function SubscriptionPage({ searchParams }: PageProps<"/suscripcion">) {
  const params = await searchParams;
  const { profile } = await requireSession();
  const access = await getAccess();
  const hasSubscription = Boolean(
    access?.subscriptionStatus && ["active", "trialing", "past_due"].includes(access.subscriptionStatus),
  );
  const trialDays = access ? daysUntil(access.trialEndsAt) : 0;
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("es-PE", { timeZone: profile.timezone, day: "numeric", month: "long" });
  const plans: PlanId[] = process.env.STRIPE_PRICE_ID_ANNUAL?.trim() ? ["monthly", "annual"] : ["monthly"];

  return (
    <main className="min-h-dvh bg-gradient-to-b from-white to-brand-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href={access?.hasAccess ? "/app" : "/suscripcion"}>
            <Logo />
          </Link>
          {access?.hasAccess && (
            <Link href="/app" className="text-sm font-medium text-brand-700 hover:underline">
              Ir a mi dashboard →
            </Link>
          )}
        </div>

        <div className="mx-auto max-w-xl space-y-3">
          {params.pago === "cancelado" && <Alert tone="info">No se realizó ningún cobro. Puedes suscribirte cuando quieras.</Alert>}
          {!access?.hasAccess && (
            <Alert tone="warning">
              🔒 Tu periodo de prueba terminó. Suscríbete para seguir registrando y viendo tus finanzas. Tus datos están
              guardados.
            </Alert>
          )}
        </div>

        {hasSubscription ? (
          <Card className="mx-auto mt-6 max-w-md p-6 text-center">
            <p className="text-2xl font-bold text-ink">Tu plan está activo ✨</p>
            {access?.currentPeriodEnd && (
              <p className="mt-2 text-slate-500">
                {access.cancelAtPeriodEnd ? "Termina" : "Se renueva"} el {formatDate(access.currentPeriodEnd)}.
              </p>
            )}
            <form action={openBillingPortal} className="mt-6">
              <Button type="submit" variant="secondary" className="w-full">
                Cambiar tarjeta, ver facturas o cancelar
              </Button>
            </form>
          </Card>
        ) : (
          <>
            <h1 className="mt-6 text-center text-4xl font-bold tracking-tight text-ink">
              Elige tu <span className="text-brand-500">plan</span>
            </h1>
            <p className="mt-3 text-center text-slate-600">
              {trialDays > 2
                ? `No te cobraremos nada hasta que terminen tus ${trialDays} días de prueba (${formatDate(access!.trialEndsAt)}).`
                : "Cancela cuando quieras. Pago seguro con Stripe."}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-6 md:flex-row md:items-stretch">
              {plans.map((id) => {
                const plan = PLANS[id];
                const highlighted = id === "annual";
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex w-full max-w-xs flex-col items-center rounded-3xl border bg-white px-8 py-8 text-center",
                      highlighted
                        ? "border-brand-400 bg-gradient-to-b from-brand-50 to-white shadow-[0_20px_50px_rgba(61,174,86,0.18)]"
                        : "border-black/10",
                    )}
                  >
                    <p className={cn("font-semibold", highlighted ? "text-brand-600" : "text-ink")}>{plan.name}</p>
                    <p className={cn("mt-3 text-5xl font-extrabold tracking-tight", highlighted ? "text-brand-800" : "text-ink")}>
                      {plan.perMonth}
                    </p>
                    <p className="text-slate-400">al mes</p>
                    {plan.badge && <p className="mt-2 text-xs font-bold text-brand-500">{plan.badge}</p>}
                    <p className="mt-2 h-5 text-xs text-slate-400">{plan.billed ?? ""}</p>
                    <form action={startCheckout} className="mt-6 w-full">
                      <input type="hidden" name="plan" value={id} />
                      <button
                        type="submit"
                        className={cn(
                          "w-full rounded-full py-3 font-semibold text-white transition-colors",
                          highlighted ? "bg-brand-800 hover:bg-brand-900" : "bg-ink hover:bg-black",
                        )}
                      >
                        Suscribirme
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <ul className="mx-auto mt-10 max-w-md space-y-2.5">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex gap-2.5 text-sm text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>

        <form action={signOut} className="mt-10 text-center">
          <button type="submit" className="text-sm text-slate-500 hover:underline">
            Cerrar sesión ({profile.email})
          </button>
        </form>
      </div>
    </main>
  );
}
