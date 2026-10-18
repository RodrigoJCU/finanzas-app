"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { stripeEnv } from "@/lib/server-env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const appUrl = () => publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
const MIN_TRIAL_MS = 48 * 60 * 60 * 1000; // Stripe exige que el fin de prueba sea al menos 48h en el futuro.

// Crea (o reutiliza) el cliente de Stripe del usuario.
async function ensureCustomer(userId: string, email: string, name: string | null, existing: string | null) {
  if (existing) return existing;
  const customer = await getStripe().customers.create({
    email,
    name: name ?? undefined,
    metadata: { user_id: userId },
  });
  await createAdminClient().from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

export async function startCheckout(formData: FormData) {
  const { userId, profile } = await requireSession();
  const stripe = getStripe();
  const { STRIPE_PRICE_ID, STRIPE_PRICE_ID_ANNUAL } = stripeEnv();
  const price = formData.get("plan") === "annual" && STRIPE_PRICE_ID_ANNUAL ? STRIPE_PRICE_ID_ANNUAL : STRIPE_PRICE_ID;
  const customer = await ensureCustomer(userId, profile.email, profile.full_name, profile.stripe_customer_id);

  // Si aún le quedan días de prueba, no se le cobra hasta que terminen.
  const trialEnd = new Date(profile.trial_ends_at).getTime();
  const keepTrial = trialEnd - Date.now() > MIN_TRIAL_MS;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: userId,
    line_items: [{ price, quantity: 1 }],
    subscription_data: {
      metadata: { user_id: userId },
      ...(keepTrial ? { trial_end: Math.floor(trialEnd / 1000) } : {}),
    },
    allow_promotion_codes: true,
    locale: "es",
    success_url: `${appUrl()}/app?pago=ok`,
    cancel_url: `${appUrl()}/suscripcion?pago=cancelado`,
  });

  if (!session.url) throw new Error("Stripe no devolvió la URL de pago");
  redirect(session.url);
}

export async function openBillingPortal() {
  const { userId, profile } = await requireSession();
  const customer = await ensureCustomer(userId, profile.email, profile.full_name, profile.stripe_customer_id);
  const configuration = stripeEnv().STRIPE_PORTAL_CONFIGURATION_ID;
  const session = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: `${appUrl()}/app/ajustes`,
    ...(configuration ? { configuration } : {}),
  });
  redirect(session.url);
}
