"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

const appUrl = () => publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

// Solo se permite volver a rutas internas (evita redirecciones abiertas a otros sitios).
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (lower.includes("email not confirmed")) return "Primero confirma tu correo con el enlace que te enviamos.";
  if (lower.includes("already registered") || lower.includes("already been registered"))
    return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  if (lower.includes("password should be") || lower.includes("weak"))
    return "La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.";
  if (lower.includes("same password") || lower.includes("different from the old"))
    return "La nueva contraseña debe ser distinta a la anterior.";
  return "No pudimos completar la acción. Inténtalo de nuevo.";
}

const emailSchema = z.email("Escribe un correo válido.").transform((value) => value.trim().toLowerCase());
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72);

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Escribe tu contraseña.") })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message) };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Escribe tu nombre.").max(120),
      email: emailSchema,
      password: passwordSchema,
    })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl()}/auth/callback?next=/app`,
    },
  });
  if (error) return { error: translateAuthError(error.message) };

  // Si en Supabase está activada la confirmación de correo, no hay sesión todavía.
  if (!data.session) {
    return { success: "¡Cuenta creada! Te enviamos un correo para confirmarla. Ábrelo y vuelve a iniciar sesión." };
  }
  redirect("/app");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${appUrl()}/auth/callback?next=/actualizar-clave`,
  });
  if (error && error.message.toLowerCase().includes("rate limit")) return { error: translateAuthError(error.message) };
  // Por seguridad, respondemos igual exista o no la cuenta.
  return { success: "Si existe una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((value) => value.password === value.confirm, { message: "Las contraseñas no coinciden." })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: translateAuthError(error.message) };
  redirect("/app?clave=actualizada");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
