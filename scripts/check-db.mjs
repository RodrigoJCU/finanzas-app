// Verifica que .env.local esté bien y que el SQL de supabase/schema.sql se haya ejecutado.
// Uso: npm run db:check
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

let failed = false;
const ok = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => {
  failed = true;
  console.log(`  ❌ ${msg}`);
};

console.log("\n1) Variables de entorno");
for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SECRET_KEY: secretKey,
})) {
  if (value) ok(name);
  else fail(`${name} está vacía en .env.local`);
}
if (failed) {
  console.log("\nRellena las variables que faltan en .env.local y vuelve a intentarlo.\n");
  process.exit(1);
}

if (!secretKey.startsWith("sb_secret_") && !secretKey.startsWith("eyJ")) {
  fail(
    "SUPABASE_SECRET_KEY no parece una clave de API (debe empezar por sb_secret_). " +
      "No es la contraseña de la base de datos: cópiala de Project Settings > API Keys > Secret keys.",
  );
}
if (!publishableKey.startsWith("sb_publishable_") && !publishableKey.startsWith("eyJ")) {
  fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no parece una clave publicable (debe empezar por sb_publishable_).");
}
if (failed) {
  console.log("\nCorrige .env.local y vuelve a ejecutar: npm run db:check\n");
  process.exit(1);
}

console.log("\n2) Tablas creadas por el SQL");
const admin = createClient(url, secretKey, { auth: { persistSession: false } });
const probe = await admin.from("profiles").select("id").limit(1);
if (probe.status === 401) {
  fail("Supabase rechazó SUPABASE_SECRET_KEY (Invalid API key). Cópiala de nuevo desde Project Settings > API Keys.");
  console.log("\nCorrige .env.local y vuelve a ejecutar: npm run db:check\n");
  process.exit(1);
}
const tables = [
  "profiles",
  "categories",
  "transactions",
  "budgets",
  "subscriptions",
  "stripe_events",
  "inbound_emails",
  "whatsapp_messages",
  "budget_progress",
];
for (const table of tables) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) {
    const detail = error.message || `HTTP ${error.code || "error"}`;
    fail(`${table}: ${detail}${error.code === "PGRST205" ? " (¿ejecutaste schema.sql?)" : ""}`);
  }
  else ok(`${table} (${count ?? 0} filas)`);
}

console.log("\n3) Seguridad (un visitante anónimo NO debe poder leer datos)");
const anon = createClient(url, publishableKey, { auth: { persistSession: false } });
const { data: leaked, error: anonError } = await anon.from("profiles").select("id").limit(1);
if (anonError?.code === "42501") ok("Acceso anónimo bloqueado correctamente");
else if (anonError) fail(`La clave publicable dio un error inesperado: ${anonError.message}`);
else if (leaked.length === 0) ok("Acceso anónimo no devuelve datos");
else fail("¡Un visitante anónimo puede leer perfiles! Vuelve a ejecutar schema.sql completo.");

console.log(failed ? "\n❌ Hay problemas. Revisa los mensajes de arriba.\n" : "\n🎉 Base de datos lista. Fase 1 completada.\n");
process.exit(failed ? 1 : 0);
