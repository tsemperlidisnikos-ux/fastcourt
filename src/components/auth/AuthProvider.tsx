"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessError } from "@/lib/auth/access";
import { enforceDeviceAccessAsync } from "@/lib/auth/device-access";
import { fetchProfile, profileToAuthSession } from "@/lib/auth/profile";
import { finalizeAuthSession } from "@/lib/auth/session-bootstrap";
import {
  ensureLibraryReadyForUser,
  prepareLibrarySessionForUser,
  resetLibraryOnSignOut,
} from "@/lib/cloud/library-sync";
import { activateLibraryScope, isLibraryScopeReady } from "@/lib/library/library-scope";
import { kickAuthRehydrate } from "@/lib/auth/hydration";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const [ready, setReady] = useState(() => !isCloudEnabled());

  useEffect(() => {
    if (!isCloudEnabled()) {
      function syncLocalLibraryScope() {
        const session = useAuthStore.getState().session;
        if (session?.user && !isLibraryScopeReady()) {
          activateLibraryScope(
            session.user.id,
            session.user.id,
            session.user,
          );
        }
      }

      kickAuthRehydrate();
      syncLocalLibraryScope();
      return useAuthStore.subscribe(syncLocalLibraryScope);
    }

    const supabase = createClient();
    let active = true;

    async function syncFromUser(userId: string, syncLibrary = false) {
      const profile = await fetchProfile(supabase!, userId);
      if (!active) return;
      if (!profile) {
        signOut();
        await supabase!.auth.signOut();
        return;
      }
      const session = profileToAuthSession(profile);
      const finalized = finalizeAuthSession(session);
      const deviceError = await enforceDeviceAccessAsync(finalized.session.user);
      if (deviceError) {
        signOut();
        await supabase!.auth.signOut();
        router.replace(`/login?error=${encodeURIComponent(deviceError)}`);
        return;
      }
      const accessError = getAccessError(finalized.session.user);
      if (accessError) {
        signOut();
        await supabase!.auth.signOut();
        router.replace(`/login?error=${encodeURIComponent(accessError)}`);
        return;
      }

      if (finalized.session.cloud) {
        if (syncLibrary) {
          setSession(finalized.session);
          await ensureLibraryReadyForUser(finalized.session.user, supabase!);
        } else {
          await prepareLibrarySessionForUser(finalized.session.user, supabase!);
          setSession(finalized.session);
        }
      } else {
        activateLibraryScope(
          finalized.session.user.id,
          finalized.session.user.id,
          finalized.session.user,
        );
        setSession(finalized.session);
      }

      await useSettingsStore.getState().hydrateForUser(finalized.session.user);
    }

    async function bootstrap() {
      const client = supabase;
      if (!client) return;

      const {
        data: { user },
      } = await client.auth.getUser();
      if (!active) return;
      if (user) {
        await syncFromUser(user.id, false);
        void ensureLibraryReadyForUser(user, client).catch((err) => {
          console.error("FastCourt library bootstrap sync failed:", err);
        });
      } else {
        signOut();
      }
    }

    void bootstrap()
      .catch((err) => {
        console.error("FastCourt auth bootstrap failed:", err);
        signOut();
      })
      .finally(() => {
        if (active) setReady(true);
      });

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!active) return;
      try {
        if (event === "SIGNED_OUT") {
          await resetLibraryOnSignOut();
          signOut();
          return;
        }
        if (authSession?.user) {
          await syncFromUser(authSession.user.id, event === "SIGNED_IN");
        }
      } catch (err) {
        console.error("FastCourt auth state sync failed:", err);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, setSession, signOut]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fc-body text-fc-muted">
        Loading session…
      </div>
    );
  }

  return children;
}
