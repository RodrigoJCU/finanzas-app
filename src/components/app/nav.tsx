"use client";

import { ArrowLeftRight, LayoutDashboard, LogOut, PiggyBank, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { cn } from "@/components/ui";

const LINKS = [
  { href: "/app", label: "Resumen", icon: LayoutDashboard },
  { href: "/app/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/app/presupuestos", label: "Presupuestos", icon: PiggyBank },
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
];

export function AppNav({ name }: { name: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  return (
    <>
      {/* Escritorio: barra lateral */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <Link href="/app" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="truncate px-3 text-sm font-medium text-slate-700 dark:text-slate-200">{name}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Móvil: cabecera + barra inferior */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <Link href="/app">
          <Logo />
        </Link>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-900">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              isActive(href) ? "text-brand-700 dark:text-brand-400" : "text-slate-500 dark:text-slate-400",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
