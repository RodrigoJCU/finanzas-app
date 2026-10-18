import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destino de los enlaces de los correos de Supabase (confirmar cuenta, recuperar contraseña).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawNext = params.get("next") ?? "/app";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";
  const supabase = await createClient();

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const destination = ok ? next : "/login?error=enlace";
  return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
}
