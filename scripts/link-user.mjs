// Crea (o reutiliza) un usuario de prueba y genera su código para vincular WhatsApp.
// Sirve para probar la Fase 2 antes de tener la pantalla de registro (Fase 3).
// Uso: npm run user:link -- tu-correo@gmail.com
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.log("\nUso: npm run user:link -- tu-correo@gmail.com\n");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.log("\n❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local\n");
  process.exit(1);
}
const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

// 1) Usuario
let { data: profile } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();
if (!profile) {
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error) {
    console.log(`\n❌ No se pudo crear el usuario: ${error.message}\n`);
    process.exit(1);
  }
  ({ data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single());
  console.log(`\n👤 Usuario creado: ${email}`);
} else {
  console.log(`\n👤 Usuario existente: ${email}`);
}

// 2) Código de vinculación (15 minutos)
const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
const { error: codeError } = await supabase
  .from("profiles")
  .update({ whatsapp_link_code: code, whatsapp_link_code_expires_at: expiresAt })
  .eq("id", profile.id);
if (codeError) {
  console.log(`\n❌ No se pudo generar el código: ${codeError.message}\n`);
  process.exit(1);
}

const bot = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.replace(/\D/g, "");
const mailbox = process.env.IMAP_USER?.trim();
const forwarding = mailbox?.includes("@")
  ? `${mailbox.split("@")[0]}+${profile.inbound_token}@${mailbox.split("@")[1]}`
  : "(configura IMAP_USER en .env.local)";

console.log(`
📱 Vincular WhatsApp (válido 15 minutos)
   Envía este mensaje al bot desde tu WhatsApp:  VINCULAR ${code}
${bot ? `   O abre este enlace en tu teléfono: https://wa.me/${bot}?text=VINCULAR%20${code}\n` : ""}
📧 Tu dirección de reenvío de correos del banco:
   ${forwarding}

⏳ Prueba gratis hasta: ${new Date(profile.trial_ends_at).toLocaleString("es-PE", { timeZone: profile.timezone })}
`);
