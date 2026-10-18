import type { Metadata } from "next";
import Link from "next/link";
import { Input, Label } from "@/components/ui";
import { requestPasswordReset } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Recupera tu contraseña</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Te enviaremos un enlace para crear una nueva.
      </p>
      <AuthForm action={requestPasswordReset} submitLabel="Enviar enlace" pendingLabel="Enviando…">
        <div>
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
        </div>
      </AuthForm>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
