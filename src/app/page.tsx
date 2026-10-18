import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { DashboardView, HeroChip } from "@/components/dashboard/dashboard-view";
import { DEMO_DASHBOARD } from "@/components/landing/demo-data";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { HeroVisual } from "@/components/landing/hero-visual";
import { LandingNav } from "@/components/landing/landing-nav";
import { Pricing } from "@/components/landing/pricing";
import { Logo } from "@/components/logo";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white text-ink">
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="overflow-hidden bg-gradient-to-br from-brand-100 via-[#ecfdec] to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:py-20 lg:grid-cols-2">
            <div>
              <h1 className="text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
                Tus gastos <span className="text-brand-500">se anotan</span> solos.
              </h1>
              <p className="mt-6 max-w-md text-xl leading-relaxed text-slate-700">
                Cada aviso que te manda tu banco se convierte en un <span className="mark text-brand-800">gasto ordenado</span>,
                y lo categorizas por WhatsApp con un audio.
              </p>
              <Link
                href="/registro"
                className="mt-9 inline-flex items-center gap-3 rounded-full bg-gradient-to-b from-brand-500 to-brand-800 px-9 py-4 text-lg font-bold text-white shadow-[0_10px_30px_rgba(0,94,35,0.35)] transition-transform hover:-translate-y-0.5"
              >
                Pruébalo ¡GRATIS!
                <ChevronRight className="h-5 w-5" aria-hidden />
              </Link>
              <p className="mt-6 flex items-start gap-3 text-sm text-slate-600">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                <span>
                  Solo leemos los avisos que tú reenvías.
                  <br />
                  Nunca tus correos personales ni tus claves.
                </span>
              </p>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="scroll-mt-16 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">
              Gráficos claros. <span className="text-brand-500">Decisiones inteligentes.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
              Todo tu mes de un vistazo: cuánto gastas, en qué, con qué tarjeta y cómo vas con tu presupuesto.
            </p>
            <div className="mt-12 rounded-[2rem] bg-[#f7f8f5] p-3 shadow-[0_30px_80px_rgba(16,24,20,0.10)] sm:p-6">
              <DashboardView
                data={DEMO_DASHBOARD}
                greeting="Hola, Camila"
                controls={
                  <>
                    <HeroChip>S/ PEN</HeroChip>
                    <HeroChip>Este mes</HeroChip>
                  </>
                }
              />
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section id="beneficios" className="scroll-mt-16 bg-gradient-to-b from-[#ecfdec] to-brand-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold tracking-tight sm:text-5xl">
              Anotar tus gastos es solo <span className="text-brand-500">el comienzo</span>
            </h2>
            <p className="mt-4 text-center text-lg text-slate-600">Tu asistente financiero vive en tu WhatsApp.</p>
            <div className="mt-12">
              <Features />
            </div>
          </div>
        </section>

        {/* Precio */}
        <section id="precio" className="scroll-mt-16 bg-gradient-to-b from-white to-brand-50 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-5xl font-bold tracking-tight">
              <span className="text-brand-500">14 días</span>{" "}
              <span className="rounded-2xl bg-brand-100 px-3 text-ink">Gratis</span>
            </h2>
            <p className="mt-5 text-center text-lg text-slate-600">
              Cancela cuando quieras.
              <br />
              No necesitas tarjeta para empezar.
            </p>
            <div className="mt-12">
              <Pricing />
            </div>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section id="preguntas" className="scroll-mt-16 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-10 text-center text-4xl font-bold tracking-tight">
              Preguntas <span className="text-brand-500">frecuentes</span>
            </h2>
            <Faq />
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_auto_auto] md:gap-24">
          <div>
            <Logo />
            <p className="mt-4 text-slate-500">Tus finanzas en piloto automático.</p>
          </div>
          <div>
            <p className="font-semibold">Producto</p>
            <ul className="mt-4 space-y-3 text-slate-500">
              <li>
                <a href="#precio" className="hover:text-ink">
                  Precios
                </a>
              </li>
              <li>
                <a href="#dashboard" className="hover:text-ink">
                  Dashboard
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-ink">
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold">Legal</p>
            <ul className="mt-4 space-y-3 text-slate-500">
              <li>
                <Link href="/privacidad" className="hover:text-ink">
                  Privacidad
                </Link>
              </li>
              <li>
                <a href="#preguntas" className="hover:text-ink">
                  Preguntas frecuentes
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl border-t border-black/5 px-4 py-6 text-sm text-slate-400">
          MentalFinz © 2026. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
