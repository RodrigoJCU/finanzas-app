"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";
import { Alert, Button } from "@/components/ui";
import type { FormState } from "./actions";

// Formulario genérico: muestra errores/éxitos de la Server Action y deshabilita el botón mientras envía.
// Se envía con onSubmit (y no con action=) para que React no borre lo escrito cuando hay un error.
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.success) return <Alert tone="success">{state.success}</Alert>;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {children}
      {state?.error && <Alert>{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
