import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-brand-100 via-[#ecfdec] to-white px-4 py-10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-7 shadow-[0_20px_60px_rgba(0,94,35,0.12)] dark:border-white/10 dark:bg-slate-900">
        {children}
      </div>
    </main>
  );
}
