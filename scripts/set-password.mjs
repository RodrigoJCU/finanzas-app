// Pone una contraseña a un usuario existente (útil para cuentas creadas con `npm run user:link`).
// Uso: npm run user:password -- tu-correo@gmail.com MiClaveSegura123
import { createClient } from "@supabase/supabase-js";

const [emailArg, password] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
if (!email?.includes("@") || !password || password.length < 8) {
  console.log("\nUso: npm run user:password -- tu-correo@gmail.com MiClaveSegura123  (mínimo 8 caracteres)\n");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
if (!profile) {
  console.log(`\n❌ No existe un usuario con el correo ${email}\n`);
  process.exit(1);
}
const { error } = await supabase.auth.admin.updateUserById(profile.id, { password, email_confirm: true });
if (error) {
  console.log(`\n❌ ${error.message}\n`);
  process.exit(1);
}
console.log(`\n✅ Contraseña actualizada. Ya puedes iniciar sesión con ${email}\n`);
