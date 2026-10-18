import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Misma regla que private.has_access() en la base de datos: prueba vigente o suscripción activa.
const ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;

export async function userHasAccess(userId: string, trialEndsAt: string): Promise<boolean> {
  if (new Date(trialEndsAt).getTime() > Date.now()) return true;
  const { count, error } = await createAdminClient()
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", [...ACTIVE_STATUSES]);
  if (error) throw new Error(`No se pudo verificar la suscripción: ${error.message}`);
  return (count ?? 0) > 0;
}
