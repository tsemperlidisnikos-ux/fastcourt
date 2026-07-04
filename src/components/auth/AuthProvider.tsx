"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
import { AppBootLoading } from "@/components/ui/AppBootLoading";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { SupabaseClient } from "@supabase/supabase-js";

const AUTH_BOOTSTRAP_MS = 12_000;

const AuthBootContext = createContext(false);

export function useAuthBooted() {
  return useContext(AuthBootContext);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label}_timeout`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const [booted, setBooted] = useState(false);

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
      setBooted(true);
      return useAuthStore.subscribe(syncLocalLibraryScope);
    }

    const supabase = createClient();
    let active = true;

    async function establishSession(
      client: SupabaseClient,
      userId: string,
    ): Promise<boolean> {
      const profile = await fetchProfile(client, userId);
      if (!active) return false;
      if (!profile) {
        signOut();
        await client.auth.signOut();
        return false;
      }

      const finalized = finalizeAuthSession(profileToAuthSession(profile));
      const accessError = getAccessError(finalized.session.user);
      if (accessError) {
        signOut();
        await client.auth.signOut();
        router.replace(`/login?error=${encodeURIComponent(accessError)}`);
        return false;
      }

      setSession(finalized.session);
      if (!finalized.session.cloud) {
        activateLibraryScope(
          finalized.session.user.id,
          finalized.session.user.id,
          finalized.session.user,
        );
      }
      return true;
    }

    async function enrichSession(
      client: SupabaseClient,
      userId: string,
      syncLibrary: boolean,
    ) {
      const session = useAuthStore.getState().session;
      if (!active || !session?.user || session.user.id !== userId) return;

      const deviceError = await enforceDeviceAccessAsync(session.user);
      if (!active) return;
      if (deviceError) {
        signOut();
        await client.auth.signOut();
        router.replace(`/login?error=${encodeURIComponent(deviceError)}`);
        return;
      }

      if (session.cloud) {
        await prepareLibrarySessionForUser(session.user, client);
        if (syncLibrary) {
          await ensureLibraryReadyForUser(session.user, client);
        } else {
          void ensureLibraryReadyForUser(session.user, client).catch((err) => {
            console.error("FastCourt library bootstrap sync failed:", err);
          });
        }
      }

      await useSettingsStore.getState().hydrateForUser(session.user);
    }

    async function syncFromUser(userId: string, syncLibrary = false) {
      if (!supabase) return;
      const ok = await establishSession(supabase, userId);
      if (!ok || !active) return;
      await enrichSession(supabase, userId, syncLibrary);
    }

    async function bootstrap() {
      const client = supabase;
      if (!client) return;

      kickAuthRehydrate();

      try {
        const {
          data: { session },
        } = await client.auth.getSession();
        if (!active) return;

        const userId = session?.user?.id ?? useAuthStore.getState().session?.user?.id;

        if (userId) {
          const ok = await withTimeout(
            establishSession(client, userId),
            AUTH_BOOTSTRAP_MS,
            "establishSession",
          );
          if (ok && active) {
            void enrichSession(client, userId, false).catch((err) => {
              console.error("FastCourt session enrichment failed:", err);
            });
          }
        } else if (!useAuthStore.getState().session) {
          signOut();
        }
      } catch (err) {
        console.error("FastCourt auth bootstrap failed:", err);
        if (!useAuthStore.getState().session) {
          signOut();
        }
      }
    }

    void bootstrap().finally(() => {
      if (active) setBooted(true);
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
          const syncLibrary = event === "SIGNED_IN";
          if (syncLibrary) {
            void syncFromUser(authSession.user.id, false).catch((err) => {
              console.error("FastCourt auth state sync failed:", err);
            });
          } else {
            await syncFromUser(authSession.user.id, false);
          }
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

  if (!booted) {
    return <AppBootLoading />;
  }

  return <AuthBootContext.Provider value={booted}>{children}</AuthBootContext.Provider>;
}
