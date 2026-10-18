// Configura Stripe (modo prueba) automáticamente: plan mensual, webhook y portal de cliente.
// Escribe STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET y STRIPE_PORTAL_CONFIGURATION_ID en .env.local.
// Uso: npm run stripe:setup -- https://tu-app.vercel.app
import { readFileSync, writeFileSync } from "node:fs";
import Stripe from "stripe";

const PRICE_CENTS = 499; // US$ 4.99 al mes. Debe coincidir con src/lib/plans.ts
const CURRENCY = "usd";
const LOOKUP_KEY = "mentalfinz_pro_monthly";
const ANNUAL_CENTS = 3588; // US$ 35.88 al año (= US$ 2.99/mes). Debe coincidir con src/lib/plans.ts
const ANNUAL_LOOKUP_KEY = "mentalfinz_pro_yearly";
const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
];

const appUrl = (process.argv[2] ?? "").trim().replace(/\/$/, "");
const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!/^https:\/\//.test(appUrl)) {
  console.log("\n❌ Uso: npm run stripe:setup -- https://tu-app.vercel.app\n");
  process.exit(1);
}
if (!secretKey?.startsWith("sk_")) {
  console.log("\n❌ Falta STRIPE_SECRET_KEY (sk_test_...) en .env.local\n");
  process.exit(1);
}
if (secretKey.startsWith("sk_live_")) {
  console.log("\n⚠️  Estás usando una clave LIVE (cobros reales). Para pruebas usa la sk_test_. Cancelado.\n");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

// 1) Producto y precio (reutiliza si ya existen)
let price = (await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], active: true, limit: 1 })).data[0];
if (!price) {
  const product = await stripe.products.create({
    name: "MentalFinz Pro",
    description: "Registro automático de gastos, categorización por WhatsApp con IA, presupuestos y alertas.",
    metadata: { app: "mentalfinz" },
  });
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: PRICE_CENTS,
    currency: CURRENCY,
    recurring: { interval: "month" },
    lookup_key: LOOKUP_KEY,
  });
  console.log(`✅ Plan creado: US$ ${(PRICE_CENTS / 100).toFixed(2)}/mes`);
} else {
  console.log("✅ Plan existente reutilizado");
}

// 1b) Precio anual (mismo producto)
let annual = (await stripe.prices.list({ lookup_keys: [ANNUAL_LOOKUP_KEY], active: true, limit: 1 })).data[0];
if (!annual) {
  annual = await stripe.prices.create({
    product: typeof price.product === "string" ? price.product : price.product.id,
    unit_amount: ANNUAL_CENTS,
    currency: CURRENCY,
    recurring: { interval: "year" },
    lookup_key: ANNUAL_LOOKUP_KEY,
  });
  console.log(`✅ Plan anual creado: US$ ${(ANNUAL_CENTS / 100).toFixed(2)}/año`);
} else {
  console.log("✅ Plan anual existente reutilizado");
}

// 2) Webhook (el secreto solo se muestra al crearlo, por eso se recrea si ya existía)
const webhookUrl = `${appUrl}/api/stripe/webhook`;
for (const endpoint of (await stripe.webhookEndpoints.list({ limit: 100 })).data) {
  if (endpoint.url === webhookUrl) await stripe.webhookEndpoints.del(endpoint.id);
}
const webhook = await stripe.webhookEndpoints.create({
  url: webhookUrl,
  enabled_events: EVENTS,
  description: "MentalFinz - suscripciones",
});
console.log(`✅ Webhook creado: ${webhookUrl}`);

// 3) Portal de cliente (cambiar tarjeta, ver facturas, cancelar)
const portal = await stripe.billingPortal.configurations.create({
  business_profile: { headline: "MentalFinz", privacy_policy_url: `${appUrl}/privacidad` },
  default_return_url: `${appUrl}/app/ajustes`,
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "name"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
  },
});
console.log("✅ Portal de cliente configurado");

// 4) Guardar en .env.local
const values = {
  STRIPE_PRICE_ID: price.id,
  STRIPE_PRICE_ID_ANNUAL: annual.id,
  STRIPE_WEBHOOK_SECRET: webhook.secret,
  STRIPE_PORTAL_CONFIGURATION_ID: portal.id,
};
let env = readFileSync(".env.local", "utf8");
for (const [key, value] of Object.entries(values)) {
  const line = `${key}=${value}`;
  env = new RegExp(`^${key}=.*$`, "m").test(env) ? env.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${env.trimEnd()}\n${line}\n`;
}
writeFileSync(".env.local", env);

console.log(`
💾 Guardado en .env.local. Copia estas 4 variables también en Vercel (Settings > Environment Variables):

STRIPE_PRICE_ID=${values.STRIPE_PRICE_ID}
STRIPE_PRICE_ID_ANNUAL=${values.STRIPE_PRICE_ID_ANNUAL}
STRIPE_WEBHOOK_SECRET=${values.STRIPE_WEBHOOK_SECRET}
STRIPE_PORTAL_CONFIGURATION_ID=${values.STRIPE_PORTAL_CONFIGURATION_ID}
`);
