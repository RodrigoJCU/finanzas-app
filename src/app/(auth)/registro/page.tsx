import type { Metadata } from "next";
import Link from "next/link";
import { Input, Label } from "@/components/ui";
import { signUp } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Crea tu cuenta</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">14 días gratis. Sin tarjeta.</p>
      <AuthForm action={signUp} submitLabel="Crear cuenta gratis" pendingLabel="Creando cuenta…">
        <div>
          <Label htmlFor="fullName">Nombre</Label>
          <Input id="fullName" name="fullName" autoComplete="name" required placeholder="Tu nombre" />
        </div>
        <div>
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
        </div>
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Mínimo 8 caracteres"
          />
        </div>
      </AuthForm>
      <p className="mt-4 text-center text-xs text-slate-400">
        Al registrarte aceptas nuestra{" "}
        <Link href="/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
      <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
