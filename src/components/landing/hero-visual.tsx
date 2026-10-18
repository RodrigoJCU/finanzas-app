import { Bell, Check, Mail } from "lucide-react";
import { Bubble, VoiceNote } from "./chat";

// Ilustración del hero: el correo del banco se convierte en un gasto anotado + la pregunta por WhatsApp.
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_20px_60px_rgba(0,94,35,0.12)]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3.5 py-1.5 text-xs font-bold tracking-wide text-ink shadow-sm">
            <Mail className="h-4 w-4 text-rose-500" aria-hidden /> CORREO
          </span>
          <span className="mx-3 h-px flex-1 border-t border-dashed border-brand-400" aria-hidden />
          <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3.5 py-1.5 text-xs font-bold tracking-wide text-ink shadow-sm">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-800 text-[10px] text-white">M</span>
            MENTALFINZ
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-100 p-4">
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <Mail className="h-4 w-4" aria-hidden /> Banco BCP
            </p>
            <p className="mt-4 rounded-xl bg-slate-200/70 p-3 text-sm text-slate-600">Consumo de S/24.50 en Starbucks</p>
            <p className="mt-8 text-right text-xs text-slate-400">9:41</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="flex items-center justify-between font-semibold text-brand-800">
              <span className="inline-flex items-center gap-1">
                MentalFinz <Check className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-ink">Hoy</span>
            </p>
            <div className="mt-4 rounded-xl bg-white p-3 shadow-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-600">
                ☕ Café
              </span>
              <p className="mt-2 text-sm font-semibold text-ink">S/ 24.50 en Starbucks</p>
            </div>
            <p className="mt-4 text-right text-xs text-slate-400">9:41 a. m.</p>
          </div>
        </div>
      </div>

      {/* Conversación de WhatsApp flotante */}
      <div className="relative -mt-6 ml-auto w-[92%] space-y-2 rounded-3xl bg-[#efeae2] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.12)] sm:w-[76%] sm:-mr-6">
        <Bubble from="bot">
          💳 <strong>Nuevo gasto</strong>: S/ 24.50 en Starbucks. ¿En qué categoría lo pongo?
        </Bubble>
        <Bubble from="user" time="9:42 a. m.">
          <VoiceNote />
        </Bubble>
        <Bubble from="bot" time="9:42 a. m.">
          ✅ Listo, lo anoté en <strong>☕ Café</strong>
        </Bubble>
      </div>

      {/* Nota adhesiva */}
      <div className="absolute -left-6 top-[19.5rem] hidden -rotate-6 rounded-xl bg-note px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] sm:block lg:-left-12">
        <p className="flex items-center gap-2 font-hand text-2xl leading-6 font-bold text-brand-800">
          <Bell className="h-6 w-6 shrink-0" aria-hidden />
          ¡Hasta los que
          <br />
          olvidas!
        </p>
      </div>
    </div>
  );
}
