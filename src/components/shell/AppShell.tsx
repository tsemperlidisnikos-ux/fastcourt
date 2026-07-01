"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TrialExpiredGate } from "@/components/billing/TrialExpiredGate";
import { AppNav } from "@/components/shell/AppNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { AppBootLoading } from "@/components/ui/AppBootLoading";
import {
  getAuthHydratedSnapshot,
  subscribeAuthHydration,
} from "@/lib/auth/hydration";
import { isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useShareStore } from "@/stores/share-store";

function AppContent({
  children,
  fullBleed,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  if (fullBleed) {
    return <>{children}</>;
  }
  return (
    <div className="flex min-h-screen flex-col bg-fc-body text-fc-text">
      <AppNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const playerShareSession = useShareStore((s) => s.playerShareSession);
  const practiceShareSession = useShareStore((s) => s.practiceShareSession);
  const gamePlanShareSession = useShareStore((s) => s.gamePlanShareSession);
  const homeworkShareSession = useShareStore((s) => s.homeworkShareSession);
  const gameDayShareSession = useShareStore((s) => s.gameDayShareSession);
  const cloud = isCloudEnabled();
  const playerShareActive =
    !!playerShareSession ||
    !!practiceShareSession ||
    !!gamePlanShareSession ||
    !!homeworkShareSession ||
    !!gameDayShareSession;

  const hydrated = useSyncExternalStore(
    subscribeAuthHydration,
    getAuthHydratedSnapshot,
    () => false,
  );

  useEffect(() => {
    if (cloud || !hydrated) return;
    if (!session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [cloud, hydrated, session, router, pathname]);

  const fullBleed =
    pathname.startsWith("/library") ||
    pathname.startsWith("/designer") ||
    pathname.startsWith("/film-room") ||
    pathname.startsWith("/settings");

  if (cloud) {
    return (
      <>
        <TrialExpiredGate />
        <AppContent fullBleed={fullBleed}>{children}</AppContent>
      </>
    );
  }

  if (!hydrated) {
    return <AppBootLoading />;
  }

  if (!session && !playerShareActive) {
    return <AppBootLoading label="Redirecting to login…" />;
  }

  if (playerShareActive && !session) {
    return null;
  }

  return (
    <>
      <TrialExpiredGate />
      <AppContent fullBleed={fullBleed}>{children}</AppContent>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppGate>{children}</AppGate>
      </SettingsProvider>
    </AuthProvider>
  );
}
