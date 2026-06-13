import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import { fetchProfile, profileToAuthSession } from "@/lib/auth/profile";
import type { AuthSession } from "@/types/auth";

export async function redeemLicenseKey(
  code: string,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  if (!isCloudEnabled()) {
    return { ok: false, error: "License redemption requires cloud mode (Supabase)." };
  }
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client is not configured." };
  }

  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Enter a license key." };

  const { data, error } = await supabase.rpc("redeem_license_key", {
    key_code: trimmed,
  });

  if (error) {
    const msg = error.message || "Could not redeem key.";
    if (/redeem_license_key/i.test(msg) && /does not exist/i.test(msg)) {
      return {
        ok: false,
        error:
          "License keys are not set up. Run the license_keys SQL migration in Supabase.",
      };
    }
    return { ok: false, error: msg };
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error || "Could not redeem key." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required to redeem a license." };

  const profile = await fetchProfile(supabase, user.id);
  if (!profile) return { ok: false, error: "Profile not found after redemption." };

  return { ok: true, session: profileToAuthSession(profile) };
}
