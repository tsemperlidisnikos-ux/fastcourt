import { DEFAULT_TRIAL_DAYS } from "@/lib/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSignupRole, isMasterAdminEmail } from "@/lib/auth/roles";
import { PROFILE_SELECT_COLUMNS, type ProfileRow } from "@/lib/auth/profile";
import type { AccessType } from "@/types/auth";

function signupAccessType(email: string): AccessType {
  return isMasterAdminEmail(email) ? "unlimited" : "trial";
}

function trialExpiresAt(email: string) {
  if (isMasterAdminEmail(email)) return null;
  const days = DEFAULT_TRIAL_DAYS;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function upsertProfileForUser(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  displayName?: string,
  organization?: string,
): Promise<ProfileRow | null> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return null;

  const role = resolveSignupRole(email);
  const row = {
    id: user.id,
    email,
    display_name: displayName?.trim() || email.split("@")[0] || "Coach",
    role,
    access_type: signupAccessType(email),
    trial_days: isMasterAdminEmail(email) ? 0 : DEFAULT_TRIAL_DAYS,
    expires_at: trialExpiresAt(email),
    organization: organization?.trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select(PROFILE_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.warn("FastCourt: profile upsert failed", error.message);
    return null;
  }

  return data as ProfileRow | null;
}
