import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Inicio">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-10 text-[15px] text-brand-800 md:flex">
          <a href="#dashboard" className="hover:text-brand-600">
            Dashboard
          </a>
          <a href="#beneficios" className="hover:text-brand-600">
            Beneficios
          </a>
          <a href="#precio" className="hover:text-brand-600">
            Precio
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/registro" className={buttonClass("primary", "px-5")}>
            Regístrate
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-ink">
            Inicia sesión
          </Link>
        </div>
      </div>
    </header>
  );
}
