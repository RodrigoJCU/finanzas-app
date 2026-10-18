import type { ReactNode } from "react";
import { AppNav } from "@/components/app/nav";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { TrialBanner } from "@/components/app/trial-banner";
import { requireAccess } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId, profile, access } = await requireAccess();

  return (
    <div className="min-h-dvh bg-[#f7f8f5] dark:bg-slate-950">
      <AppNav name={profile.full_name ?? profile.email} />
      <div className="pb-24 md:pb-10 md:pl-64">
        {access.trialActive && !access.subscriptionStatus && <TrialBanner trialEndsAt={access.trialEndsAt} />}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <RealtimeRefresh userId={userId} />
    </div>
  );
}
