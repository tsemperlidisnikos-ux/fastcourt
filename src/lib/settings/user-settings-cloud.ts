import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSettingsBundle } from "@/types/user-settings";

export interface UserSettingsRow {
  user_id: string;
  appearance: UserSettingsBundle["appearance"] | null;
  pdf_brand: UserSettingsBundle["pdfBrand"] | null;
  practice_live: UserSettingsBundle["practiceLive"] | null;
  designer: UserSettingsBundle["designer"] | null;
  notifications: UserSettingsBundle["notifications"] | null;
  use_org_branding: boolean;
  devices: UserSettingsBundle["devices"] | null;
  updated_at: string;
}

const SELECT_COLUMNS =
  "user_id, appearance, pdf_brand, practice_live, designer, notifications, use_org_branding, devices, updated_at";

function rowToBundle(row: UserSettingsRow): UserSettingsBundle {
  return {
    appearance: row.appearance ?? undefined,
    pdfBrand: row.pdf_brand ?? undefined,
    practiceLive: row.practice_live ?? undefined,
    designer: row.designer ?? undefined,
    notifications: row.notifications ?? undefined,
    useOrgBranding: row.use_org_branding,
    devices: Array.isArray(row.devices) ? row.devices : [],
    cloudSyncedAt: row.updated_at,
  };
}

function bundleToRow(userId: string, bundle: UserSettingsBundle) {
  return {
    user_id: userId,
    appearance: bundle.appearance ?? null,
    pdf_brand: bundle.pdfBrand ?? null,
    practice_live: bundle.practiceLive ?? null,
    designer: bundle.designer ?? null,
    notifications: bundle.notifications ?? null,
    use_org_branding: bundle.useOrgBranding ?? true,
    devices: bundle.devices ?? [],
    updated_at: new Date().toISOString(),
  };
}

export async function fetchCloudUserSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; bundle: UserSettingsBundle | null } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("user_settings")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (/user_settings/i.test(error.message) && /does not exist/i.test(error.message)) {
      return { ok: true, bundle: null };
    }
    return { ok: false, error: error.message };
  }

  if (!data) return { ok: true, bundle: null };
  return { ok: true, bundle: rowToBundle(data as UserSettingsRow) };
}

export async function saveCloudUserSettings(
  supabase: SupabaseClient,
  userId: string,
  bundle: UserSettingsBundle,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("user_settings")
    .upsert(bundleToRow(userId, bundle), { onConflict: "user_id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
