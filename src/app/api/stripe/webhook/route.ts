import type Stripe from "stripe";
import { stripeEnv } from "@/lib/server-env";
import { getStripe, syncSubscription } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe avisa aquí cada cambio de suscripción (pago, renovación, cancelación, fallo de cobro).
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await request.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, stripeEnv().STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createAdminClient();
  // Idempotencia: Stripe puede reenviar el mismo evento.
  const { error: claimError } = await supabase.from("stripe_events").insert({ id: event.id, type: event.type });
  if (claimError?.code === "23505") return Response.json({ received: true, duplicate: true });
  if (claimError) return new Response("DB error", { status: 500 });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncSubscription(await stripe.subscriptions.retrieve(id));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
        // Se vuelve a leer de Stripe para guardar siempre el estado más reciente (los eventos pueden llegar desordenados).
        await syncSubscription(await stripe.subscriptions.retrieve(event.data.object.id));
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe] error procesando", event.type, event.id, error);
    // Se libera el evento para que el reintento de Stripe lo vuelva a procesar.
    await supabase.from("stripe_events").delete().eq("id", event.id);
    return new Response("Processing error", { status: 500 });
  }

  return Response.json({ received: true });
}
