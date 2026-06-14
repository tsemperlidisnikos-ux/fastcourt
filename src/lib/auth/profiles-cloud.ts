import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/auth/profile";
import { PROFILE_SELECT_COLUMNS } from "@/lib/auth/profile";
import type { AdminUserRecord } from "@/types/admin-user";

export function isPersistableCloudProfile(user: AdminUserRecord): boolean {
  return !user.id.startsWith("local-") && !user.id.startsWith("demo-");
}

export function profileRowToAdminUser(row: ProfileRow): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.email,
    role: row.role,
    accessType: row.access_type,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    organization: row.organization ?? undefined,
    signupComplete: true,
    trialDays: row.trial_days,
  };
}

export function adminUserToProfileUpdate(record: AdminUserRecord) {
  return {
    id: record.id,
    email: record.email.trim().toLowerCase(),
    display_name: record.displayName.trim() || record.email,
    role: record.role,
    access_type: record.accessType,
    expires_at: record.expiresAt,
    trial_days: record.trialDays ?? 14,
    organization: record.organization?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchCloudAdminUsers(
  supabase: SupabaseClient,
): Promise<{ ok: true; users: AdminUserRecord[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (data ?? []) as ProfileRow[];
  const users = rows.map(profileRowToAdminUser).sort((a, b) => {
    if (a.role === "admin") return -1;
    if (b.role === "admin") return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return { ok: true, users };
}

export async function saveCloudAdminUsers(
  supabase: SupabaseClient,
  users: AdminUserRecord[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cloudUsers = users.filter(isPersistableCloudProfile);
  if (!cloudUsers.length) return { ok: true };

  const payload = cloudUsers.map(adminUserToProfileUpdate);
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
