"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessError } from "@/lib/auth/access";
import { fetchProfile, profileToAuthSession } from "@/lib/auth/profile";
import { finalizeAuthSession } from "@/lib/auth/session-bootstrap";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const [ready, setReady] = useState(() => !isCloudEnabled());

  useEffect(() => {
    if (!isCloudEnabled()) {
      return;
    }

    const supabase = createClient();
    let active = true;

    async function syncFromUser(userId: string) {
      const profile = await fetchProfile(supabase!, userId);
      if (!active) return;
      if (!profile) {
        signOut();
        await supabase!.auth.signOut();
        return;
      }
      const session = profileToAuthSession(profile);
      const finalized = finalizeAuthSession(session);
      const accessError = getAccessError(finalized.session.user);
      if (accessError) {
        signOut();
        await supabase!.auth.signOut();
        router.replace(`/login?error=${encodeURIComponent(accessError)}`);
        return;
      }
      setSession(finalized.session);
    }

    async function bootstrap() {
      const client = supabase;
      if (!client) return;

      const {
        data: { user },
      } = await client.auth.getUser();
      if (!active) return;
      if (user) {
        await syncFromUser(user.id);
      } else {
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
      if (event === "SIGNED_OUT") {
        signOut();
        return;
      }
      if (authSession?.user) {
        await syncFromUser(authSession.user.id);
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
