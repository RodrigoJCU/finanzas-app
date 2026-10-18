"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Cuando entra o cambia un movimiento (correo, WhatsApp), el dashboard se actualiza solo.
export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    (async () => {
      // El canal debe conectarse con el token del usuario; si no, la seguridad (RLS) no le envía nada.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;

      channel = supabase
        .channel(`transactions-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
          () => {
            clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 400);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
