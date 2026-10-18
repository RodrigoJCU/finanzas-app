"use client";

import { CheckCircle2, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { generateWhatsappCode, unlinkWhatsapp } from "@/app/app/actions";
import { Alert, Button, buttonClass } from "@/components/ui";

export function WhatsappLink({ phone, botNumber }: { phone: string | null; botNumber: string | null }) {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState<{ code: string; waLink: string | null; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (phone) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-brand-800 dark:text-brand-300">
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          Vinculado al número <strong>+{phone}</strong>
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escríbele <strong>ayuda</strong> al asistente para ver lo que puede hacer.
        </p>
        {error && <Alert>{error}</Alert>}
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Desvincular tu WhatsApp? Dejarás de recibir avisos.")) return;
            startTransition(async () => {
              const result = await unlinkWhatsapp();
              if (!result.ok) setError(result.error);
            });
          }}
        >
          Desvincular
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Te escribiremos por WhatsApp cada vez que tu banco te notifique un gasto, para que nos digas la categoría con un
        mensaje o un audio.
      </p>
      {error && <Alert>{error}</Alert>}
      {code ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950">
          <p className="text-sm text-brand-900 dark:text-brand-200">Envía este mensaje al asistente desde tu WhatsApp:</p>
          <p className="my-2 select-all text-2xl font-bold tracking-widest text-brand-900 dark:text-brand-100">
            VINCULAR {code.code}
          </p>
          <p className="mb-3 text-xs text-brand-800 dark:text-brand-300">
            El código vence a las{" "}
            {new Date(code.expiresAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}.
            {botNumber && <> Número del asistente: +{botNumber}</>}
          </p>
          {code.waLink && (
            <a href={code.waLink} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              <MessageCircle className="h-4 w-4" aria-hidden />
              Abrir WhatsApp
            </a>
          )}
          <p className="mt-3 text-xs text-brand-800 dark:text-brand-300">
            Cuando el asistente te confirme, recarga esta página.
          </p>
        </div>
      ) : (
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await generateWhatsappCode();
              if (result.ok) setCode(result);
              else setError(result.error);
            })
          }
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {pending ? "Generando…" : "Vincular mi WhatsApp"}
        </Button>
      )}
    </div>
  );
}
