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
import type { SupabaseClient } from "@supabase/supabase-js";

const AUTH_BOOTSTRAP_MS = 12_000;

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

      try {
        const {
          data: { user },
        } = await withTimeout(client.auth.getUser(), AUTH_BOOTSTRAP_MS, "getUser");
        if (!active) return;

        if (user) {
          const ok = await withTimeout(
            establishSession(client, user.id),
            AUTH_BOOTSTRAP_MS,
            "establishSession",
          );
          if (ok && active) {
            void enrichSession(client, user.id, false).catch((err) => {
              console.error("FastCourt session enrichment failed:", err);
            });
          }
        } else {
          signOut();
        }
      } catch (err) {
        console.error("FastCourt auth bootstrap failed:", err);
        signOut();
      }
    }

    void bootstrap().finally(() => {
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
