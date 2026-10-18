import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { supabaseServerEnv } from "@/lib/server-env";
import type { Database } from "@/types/database";

// Cliente con la clave secreta: IGNORA RLS. Solo para webhooks y tareas del servidor
// (correo entrante, WhatsApp, Stripe). Nunca lo importes en un componente de cliente.
let adminClient: ReturnType<typeof createClient<Database>> | undefined;

export function createAdminClient() {
  adminClient ??= createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServerEnv().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return adminClient;
}
