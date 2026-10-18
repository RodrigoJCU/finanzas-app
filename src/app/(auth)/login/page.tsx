import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Input, Label } from "@/components/ui";
import { signIn } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/app";
  const linkError = params.error === "enlace";

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Bienvenido de nuevo</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Inicia sesión para ver tus finanzas.</p>
      {linkError && (
        <div className="mb-4">
          <Alert>El enlace no es válido o ya venció. Solicita uno nuevo.</Alert>
        </div>
      )}
      <AuthForm action={signIn} submitLabel="Iniciar sesión" pendingLabel="Ingresando…">
        <input type="hidden" name="next" value={next} />
        <div>
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link href="/recuperar" className="mb-1.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
              ¿La olvidaste?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
      </AuthForm>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
          Pruébalo gratis
        </Link>
      </p>
    </>
  );
}
