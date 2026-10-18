// Planes que se muestran en la web. Los montos deben coincidir con los precios que crea
// `npm run stripe:setup` (mensual 499 centavos, anual 3588 centavos).
export type PlanId = "monthly" | "annual";

export const PLANS: Record<
  PlanId,
  { id: PlanId; name: string; perMonth: string; billed: string | null; badge: string | null }
> = {
  monthly: {
    id: "monthly",
    name: "mensual",
    perMonth: "US$ 4.99",
    billed: null,
    badge: null,
  },
  annual: {
    id: "annual",
    name: "anual",
    perMonth: "US$ 2.99",
    billed: "Facturado anual: US$ 35.88",
    badge: "40% OFF",
  },
};

export const TRIAL_DAYS = 14;

export const PLAN_FEATURES = [
  { title: "Categorización con IA", icon: "brain" },
  { title: "Gráficos y resúmenes", icon: "chart" },
  { title: "Asistente por WhatsApp", icon: "chat" },
  { title: "Alertas de presupuesto", icon: "alert" },
] as const;
