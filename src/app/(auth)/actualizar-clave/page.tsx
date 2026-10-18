import type { Metadata } from "next";
import { Input, Label } from "@/components/ui";
import { updatePassword } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Crea una nueva contraseña</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Usa al menos 8 caracteres.</p>
      <AuthForm action={updatePassword} submitLabel="Guardar contraseña" pendingLabel="Guardando…">
        <div>
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <Label htmlFor="confirm">Repite la contraseña</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </div>
      </AuthForm>
    </>
  );
}
