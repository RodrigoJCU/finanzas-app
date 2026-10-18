import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que requieren sesión iniciada.
const PROTECTED = ["/app", "/suscripcion", "/actualizar-clave"];
// Rutas solo para visitantes (si ya hay sesión, se redirige al dashboard).
const GUEST_ONLY = ["/login", "/registro"];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

// Refresca la sesión de Supabase en cada visita y protege las páginas privadas.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims() valida el JWT; no lo quites ni pongas código entre createServerClient y esta línea.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  if (!isLoggedIn && matches(path, PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirectWithCookies(url, response);
  }

  if (isLoggedIn && matches(path, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

// Conserva las cookies de sesión refrescadas al redirigir.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // Todo excepto archivos estáticos, la PWA y los webhooks (que no usan sesión).
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|api/whatsapp|api/stripe/webhook|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
