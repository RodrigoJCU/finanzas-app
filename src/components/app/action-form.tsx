"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/app/app/actions";
import { Alert, Button } from "@/components/ui";

// Formulario para Server Actions del dashboard: muestra el resultado y limpia los campos solo si salió bien.
// Se envía con onSubmit (y no con action=) para que React no borre lo escrito cuando hay un error.
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Guardando…",
  resetOnSuccess = true,
  className,
  children,
}: {
  action: (state: ActionResult | undefined, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={className ?? "space-y-4"}>
      {children}
      {state && !state.ok && <Alert>{state.error}</Alert>}
      {state?.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
