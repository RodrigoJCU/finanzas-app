import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Access = {
  hasAccess: boolean;
  trialActive: boolean;
  trialEndsAt: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

// Usuario con sesión + su perfil. cache() evita repetir la consulta en el mismo render.
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) return null;
  return { userId, profile: profile as Tables<"profiles"> };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export const getAccess = cache(async (): Promise<Access | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_access");
  const row = data?.[0];
  if (error || !row) return null;
  return {
    hasAccess: row.has_access,
    trialActive: row.trial_active,
    trialEndsAt: row.trial_ends_at,
    subscriptionStatus: row.subscription_status,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
});

// Para las páginas del dashboard: exige sesión y acceso (prueba o suscripción), si no, al paywall.
export async function requireAccess() {
  const session = await requireSession();
  const access = await getAccess();
  if (!access?.hasAccess) redirect("/suscripcion");
  return { ...session, access };
}
