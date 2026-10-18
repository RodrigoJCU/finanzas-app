import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <Logo />
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sin conexión</h1>
      <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
        Revisa tu internet y vuelve a intentarlo. Tus datos están seguros.
      </p>
    </main>
  );
}
