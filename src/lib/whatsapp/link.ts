import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database";

const CODE_TTL_MINUTES = 15;

// Genera un código de 6 dígitos que el usuario envía al bot desde su WhatsApp para vincular su número.
// Así se comprueba que el número es suyo y, de paso, se abre la ventana gratuita de 24h.
export async function createLinkCode(userId: string): Promise<{ code: string; expiresAt: string; waLink: string | null }> {
  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { error } = await supabase
      .from("profiles")
      .update({ whatsapp_link_code: code, whatsapp_link_code_expires_at: expiresAt })
      .eq("id", userId);
    if (!error) {
      const bot = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.replace(/\D/g, "");
      const waLink = bot ? `https://wa.me/${bot}?text=${encodeURIComponent(`VINCULAR ${code}`)}` : null;
      return { code, expiresAt, waLink };
    }
    if (error.code !== "23505") throw new Error(`No se pudo crear el código: ${error.message}`);
  }
  throw new Error("No se pudo generar un código único, inténtalo de nuevo");
}

// Vincula el número que envió el código. Si ese número estaba en otra cuenta, se desvincula de ella.
export async function linkPhoneWithCode(code: string, phone: string): Promise<Tables<"profiles"> | null> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("whatsapp_link_code", code)
    .gt("whatsapp_link_code_expires_at", new Date().toISOString())
    .maybeSingle();
  if (!profile) return null;

  await supabase
    .from("profiles")
    .update({ whatsapp_phone: null, whatsapp_linked_at: null })
    .eq("whatsapp_phone", phone)
    .neq("id", profile.id);

  const now = new Date().toISOString();
  const { data: linked, error } = await supabase
    .from("profiles")
    .update({
      whatsapp_phone: phone,
      whatsapp_linked_at: now,
      whatsapp_last_inbound_at: now,
      whatsapp_link_code: null,
      whatsapp_link_code_expires_at: null,
    })
    .eq("id", profile.id)
    .select("*")
    .single();
  if (error) throw new Error(`No se pudo vincular el número: ${error.message}`);
  return linked;
}

// Dirección de reenvío personal del usuario: buzon+token@gmail.com
export function forwardingAddress(inboundToken: string): string | null {
  const base = process.env.IMAP_USER?.trim();
  if (!base || !base.includes("@")) return null;
  const [local, domain] = base.split("@");
  return `${local}+${inboundToken}@${domain}`;
}
