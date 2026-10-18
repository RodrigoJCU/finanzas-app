import { BellRing } from "lucide-react";
import type { ReactNode } from "react";
import { Bubble, VoiceNote } from "./chat";

function FeatureCard({ number, title, children }: { number: number; title: ReactNode; children: ReactNode }) {
  return (
    <article className="flex flex-col rounded-3xl bg-[#f7f8f5] p-6 shadow-[0_2px_14px_rgba(16,24,20,0.05)]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
          {number}.
        </span>
        <h3 className="pt-1.5 text-lg leading-snug font-semibold text-ink">{title}</h3>
      </div>
      <div className="mt-6 flex flex-1 flex-col justify-center">{children}</div>
    </article>
  );
}

const G = ({ children }: { children: ReactNode }) => <span className="text-brand-700">{children}</span>;

export function Features() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <FeatureCard
        number={1}
        title={
          <>
            Categoriza con <G>un audio.</G>
          </>
        }
      >
        <div className="space-y-2">
          <Bubble from="bot">💳 S/ 45.90 en Wong. ¿En qué categoría lo pongo?</Bubble>
          <Bubble from="user">
            <VoiceNote seconds={3} />
          </Bubble>
          <Bubble from="bot">
            🎙️ <em>&quot;compras del súper&quot;</em>
            <br />✅ → 🛒 Supermercado
          </Bubble>
        </div>
      </FeatureCard>

      <FeatureCard
        number={2}
        title={
          <>
            Pregúntale <G>cómo vas.</G>
          </>
        }
      >
        <div className="space-y-2">
          <Bubble from="user">resumen</Bubble>
          <Bubble from="bot">
            📊 <strong>Resumen de octubre</strong>
            <br />
            Gastos: S/ 1,820.40
            <br />
            🍽️ Restaurantes: S/ 420.00
            <br />
            🚗 Transporte: S/ 186.50
          </Bubble>
        </div>
      </FeatureCard>

      <FeatureCard
        number={3}
        title={
          <>
            Anota también <G>lo que pagas en efectivo.</G>
          </>
        }
      >
        <div className="space-y-2">
          <Bubble from="user">gasté 15 soles en un taxi</Bubble>
          <Bubble from="bot">📝 Gasto registrado: S/ 15.00 → 🚗 Transporte</Bubble>
          <Bubble from="user">me pagaron 3000 soles</Bubble>
          <Bubble from="bot">📝 Ingreso registrado: S/ 3,000.00 → 💼 Salario</Bubble>
        </div>
      </FeatureCard>

      <FeatureCard
        number={4}
        title={
          <>
            Lee los correos <G>de tu banco.</G>
          </>
        }
      >
        <ul className="space-y-2">
          {[
            { bank: "BCP", text: "Consumo Tottus", amount: "S/ 42.10", tag: "🛒 Supermercado" },
            { bank: "Interbank", text: "Compra Uber", amount: "S/ 18.90", tag: "🚗 Transporte" },
            { bank: "Yape", text: "Yapeaste a Ana", amount: "S/ 30.00", tag: "🎁 Regalos" },
          ].map((row) => (
            <li key={row.bank} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm shadow-sm">
              <span className="rounded-md bg-brand-800 px-1.5 py-0.5 text-[10px] font-bold text-white">{row.bank}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600">{row.text}</span>
              <span className="font-semibold text-ink">{row.amount}</span>
              <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 sm:inline">
                {row.tag}
              </span>
            </li>
          ))}
        </ul>
      </FeatureCard>

      <FeatureCard
        number={5}
        title={
          <>
            Soles y dólares, <G>cada uno en su lugar.</G>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Soles", amount: "S/ 1,820.40", color: "bg-brand-800" },
            { label: "Dólares", amount: "US$ 64.90", color: "bg-brand-500" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-4 text-center shadow-sm">
              <span className={`mx-auto mb-2 block h-1.5 w-10 rounded-full ${item.color}`} aria-hidden />
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 font-bold text-ink">{item.amount}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-slate-500">Sin mezclar monedas ni hacer conversiones raras.</p>
      </FeatureCard>

      <FeatureCard
        number={6}
        title={
          <>
            Te avisa cuando estás <G>gastando de más.</G>
          </>
        }
      >
        <div className="relative rounded-2xl bg-white p-4 shadow-sm">
          <BellRing className="absolute -right-2 -top-3 h-9 w-9 rounded-xl bg-white p-2 text-rose-500 shadow-md" aria-hidden />
          <p className="text-sm text-slate-500">Gasto en restaurantes</p>
          <p className="text-2xl font-bold text-ink">S/ 420.50</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 w-[85%] rounded-full bg-orange-500" />
          </div>
          <p className="mt-2 text-sm">
            <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">85%</span>{" "}
            <span className="text-slate-500">de tu presupuesto</span>
          </p>
        </div>
        <Bubble from="bot" className="mt-3">
          ⚠️ Ya usaste el 85% de 🍽️ Restaurantes. Te quedan S/ 79.50 este mes.
        </Bubble>
      </FeatureCard>
    </div>
  );
}
