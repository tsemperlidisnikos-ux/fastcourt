"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchProfile } from "@/lib/auth/profile";
import { upsertProfileForUser } from "@/lib/auth/signup";
import {
  PASSWORD_RECOVERY_LOGIN_PATH,
  safeNextPath,
} from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/client";

export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Confirming your account…");

  useEffect(() => {
    let active = true;

    async function confirm() {
      const code = searchParams.get("code");
      const recovery = searchParams.get("recovery") === "1";
      const next = recovery
        ? PASSWORD_RECOVERY_LOGIN_PATH
        : safeNextPath(searchParams.get("next"));

      if (!code) {
        router.replace("/login?error=auth_callback_failed");
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        router.replace("/login?error=cloud_not_configured");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`);
        return;
      }

      if (data.user) {
        const existing = await fetchProfile(supabase, data.user.id);
        if (!existing) {
          const meta = data.user.user_metadata as { display_name?: string } | undefined;
          await upsertProfileForUser(supabase, data.user, meta?.display_name);
        }
      }

      setMessage(recovery ? "Opening password reset…" : "Success — opening FastCourt…");
      router.replace(next);
    }

    void confirm().catch(() => {
      if (!active) return;
      router.replace("/login?error=auth_callback_failed");
    });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 text-center text-[#e2e8f0]">
      <p>{message}</p>
    </div>
  );
}
