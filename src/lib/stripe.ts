import "server-only";
import Stripe from "stripe";
import { stripeEnv } from "@/lib/server-env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus, TablesInsert } from "@/types/database";

let client: Stripe | undefined;

export function getStripe() {
  client ??= new Stripe(stripeEnv().STRIPE_SECRET_KEY, {
    appInfo: { name: "MentalFinz" },
    maxNetworkRetries: 2,
  });
  return client;
}

const KNOWN_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
];

const toIso = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString() : null);

// Guarda en Supabase el estado actual de una suscripción de Stripe (fuente de verdad: Stripe).
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const supabase = createAdminClient();
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  let userId = subscription.metadata?.user_id || null;
  if (!userId) {
    const { data } = await supabase.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId) throw new Error(`No se encontró el usuario de la suscripción ${subscription.id}`);

  // Desde 2025 Stripe guarda el periodo en cada ítem de la suscripción.
  const item = subscription.items.data[0];
  const status = KNOWN_STATUSES.includes(subscription.status as SubscriptionStatus)
    ? (subscription.status as SubscriptionStatus)
    : "incomplete";

  const row: TablesInsert<"subscriptions"> = {
    id: subscription.id,
    user_id: userId,
    status,
    price_id: item?.price.id ?? null,
    current_period_start: toIso(item?.current_period_start),
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end || subscription.cancel_at !== null,
    canceled_at: toIso(subscription.canceled_at),
  };

  const { error } = await supabase.from("subscriptions").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`No se pudo guardar la suscripción: ${error.message}`);

  await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
}
