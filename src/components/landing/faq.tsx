import { ChevronDown } from "lucide-react";

const QUESTIONS = [
  {
    q: "¿Tengo que darles la clave de mi banco o de mi correo?",
    a: "No. Nunca te pedimos contraseñas. Tú configuras en tu correo que se reenvíen solo los avisos de tu banco a tu dirección personal de MentalFinz. Puedes desactivarlo cuando quieras.",
  },
  {
    q: "¿Qué bancos funcionan?",
    a: "Cualquier banco o billetera que te envíe avisos por correo: BCP, Interbank, BBVA, Scotiabank, BanBif, Yape, Plin y más. La inteligencia artificial entiende el formato de cada uno.",
  },
  {
    q: "¿Cómo le digo la categoría de un gasto?",
    a: "Te escribimos por WhatsApp y respondes como quieras: tocando una opción de la lista, con una palabra (\"almuerzo\") o con una nota de voz. También puedes hacerlo desde el dashboard.",
  },
  {
    q: "¿Puedo anotar gastos en efectivo?",
    a: "Sí. Escríbele al asistente algo como \"gasté 15 soles en un taxi\" o regístralo desde la app en segundos.",
  },
  {
    q: "¿Necesito tarjeta para la prueba gratis?",
    a: "No. Tienes 14 días gratis sin tarjeta. Al terminar eliges si te suscribes; si no, no se te cobra nada.",
  },
  {
    q: "¿Es una app que tengo que descargar?",
    a: "No hace falta tienda de apps: MentalFinz funciona en el navegador y puedes instalarla en la pantalla de inicio de tu celular como cualquier app.",
  },
];

export function Faq() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {QUESTIONS.map((item) => (
        <details key={item.q} className="group rounded-2xl bg-white px-5 py-4 shadow-[0_2px_14px_rgba(16,24,20,0.06)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
            {item.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-brand-600 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-3 text-slate-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
