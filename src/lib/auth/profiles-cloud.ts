import { DEFAULT_TRIAL_DAYS } from "@/lib/config";
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
    trial_days: record.trialDays ?? DEFAULT_TRIAL_DAYS,
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

  // Prefer UPDATE (not upsert): upsert still evaluates INSERT RLS and fails
  // for admins because only profiles_insert_own (auth.uid() = id) existed.
  for (const record of cloudUsers) {
    const payload = adminUserToProfileUpdate(record);
    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", record.id)
      .select("id");

    if (error) return { ok: false, error: error.message };

    // Row missing (e.g. never signed up in cloud) — try insert; needs admin INSERT policy.
    if (!data?.length) {
      const { error: insertError } = await supabase.from("profiles").insert(payload);
      if (insertError) {
        return {
          ok: false,
          error:
            insertError.message.includes("row-level security")
              ? `${insertError.message} Run migration 018_profiles_admin_insert.sql in Supabase SQL Editor.`
              : insertError.message,
        };
      }
    }
  }

  return { ok: true };
}

/** Server-side save (service role) — bypasses client RLS on profiles. */
export async function saveCloudAdminUsersViaApi(
  users: AdminUserRecord[],
): Promise<{ ok: true; updated?: number } | { ok: false; error: string }> {
  const cloudUsers = users.filter(isPersistableCloudProfile);
  if (!cloudUsers.length) return { ok: true, updated: 0 };

  try {
    const response = await fetch("/api/admin/profiles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ users: cloudUsers }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; hint?: string; updated?: number }
      | null;
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        error: payload?.hint || payload?.error || `HTTP ${response.status}`,
      };
    }
    return { ok: true, updated: payload.updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Cloud save failed",
    };
  }
}

export async function deleteCloudAdminUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: settingsError } = await supabase
    .from("user_settings")
    .delete()
    .eq("user_id", userId);
  if (settingsError && !/does not exist/i.test(settingsError.message)) {
    return { ok: false, error: settingsError.message };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) return { ok: false, error: profileError.message };
  return { ok: true };
}

export async function purgeCloudUserDataExceptAdmin(
  supabase: SupabaseClient,
  adminId: string,
): Promise<
  | { ok: true; profilesRemoved: number; settingsRemoved: number }
  | { ok: false; error: string }
> {
  const { data: settingsRows, error: settingsSelectError } = await supabase
    .from("user_settings")
    .select("user_id")
    .neq("user_id", adminId);

  if (settingsSelectError && !/does not exist/i.test(settingsSelectError.message)) {
    return { ok: false, error: settingsSelectError.message };
  }

  if (!settingsSelectError) {
    const { error: settingsDeleteError } = await supabase
      .from("user_settings")
      .delete()
      .neq("user_id", adminId);
    if (settingsDeleteError) {
      return { ok: false, error: settingsDeleteError.message };
    }
  }

  const { data: profileRows, error: profilesSelectError } = await supabase
    .from("profiles")
    .select("id")
    .neq("id", adminId);

  if (profilesSelectError) {
    return { ok: false, error: profilesSelectError.message };
  }

  const { error: profilesDeleteError } = await supabase
    .from("profiles")
    .delete()
    .neq("id", adminId);

  if (profilesDeleteError) {
    return { ok: false, error: profilesDeleteError.message };
  }

  return {
    ok: true,
    profilesRemoved: profileRows?.length ?? 0,
    settingsRemoved: settingsRows?.length ?? 0,
  };
}
