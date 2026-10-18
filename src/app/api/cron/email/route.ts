import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { processInbox } from "@/lib/email/inbox";
import { cronEnv } from "@/lib/server-env";

// Lo llama Supabase (pg_cron) cada minuto. También acepta el cron diario de Vercel como respaldo.
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${cronEnv().CRON_SECRET}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function run(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const startedAt = Date.now();
  try {
    // Deja margen antes del límite de 60s de la función.
    const result = await processInbox({ deadline: startedAt + 45_000 });
    return Response.json({ ok: true, ms: Date.now() - startedAt, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[cron/email] error", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
