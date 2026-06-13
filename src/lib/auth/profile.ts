import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthSession, SessionUser } from "@/types/auth";
import type { Role } from "@/lib/config";
import { applyAdminRegistryToSession } from "@/lib/auth/admin-users";
import { resolveSignupRole, isMasterAdminEmail } from "@/lib/auth/roles";

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  expires_at: string | null;
  access_type: SessionUser["accessType"];
  trial_days: number;
  created_at: string;
}

export function profileToSessionUser(profile: ProfileRow): SessionUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name || profile.email,
    role: profile.role,
    accessType: profile.access_type,
    expiresAt: profile.expires_at,
  };
}

export function profileToAuthSession(profile: ProfileRow): AuthSession {
  return {
    user: profileToSessionUser(profile),
    createdAt: profile.created_at,
    cloud: true,
  };
}

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, role, expires_at, access_type, trial_days, created_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("FastCourt: profile fetch failed", error.message);
    return null;
  }

  return data as ProfileRow | null;
}

export function localDemoSession(
  email: string,
  displayName?: string,
): AuthSession {
  const normalized = email.trim().toLowerCase();
  const role = resolveSignupRole(normalized);
  const master = isMasterAdminEmail(normalized);

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const baseUser = {
    id: `local-${normalized}`,
    email: normalized,
    displayName: displayName?.trim() || normalized.split("@")[0] || "Coach",
    role,
    accessType: master ? ("unlimited" as const) : ("trial" as const),
    expiresAt: master ? null : trialEnd.toISOString(),
  };

  return {
    user: applyAdminRegistryToSession(baseUser),
    createdAt: new Date().toISOString(),
    cloud: false,
  };
}
