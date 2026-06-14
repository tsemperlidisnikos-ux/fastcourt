import { findOrganizationMembership } from "@/lib/auth/org-access";
import { orgHasConfiguredBranding } from "@/lib/settings/org-branding";
import {
  mergeOrgBrandingIntoPdfBrand,
  shouldApplyOrgBranding,
} from "@/lib/settings/org-branding";
import {
  DEFAULT_APPEARANCE,
  loadAppearanceSettings,
  saveAppearanceSettings,
} from "@/lib/settings/appearance-settings";
import {
  DEFAULT_PDF_BRAND,
  loadPdfBrandSettings,
  savePdfBrandSettings,
} from "@/lib/settings/pdf-branding";
import {
  loadPracticeLivePrefs,
  savePracticeLivePrefs,
  type PracticeLivePrefs,
} from "@/lib/practice/live-prefs";
import { fetchCloudUserSettings, saveCloudUserSettings } from "@/lib/settings/user-settings-cloud";
import {
  loadScopedUserSettings,
  mergeUserSettingsBundles,
  saveScopedUserSettings,
} from "@/lib/settings/user-settings-storage";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/auth";
import type { AppearanceSettings } from "@/types/appearance-settings";
import type { PdfBrandSettings } from "@/types/pdf-branding";
import {
  DEFAULT_DESIGNER_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
  type DesignerUserPrefs,
  type NotificationPrefs,
  type UserSettingsBundle,
} from "@/types/user-settings";

export interface ResolvedUserSettings {
  appearance: AppearanceSettings;
  pdfBrand: PdfBrandSettings;
  practiceLive: PracticeLivePrefs;
  designer: DesignerUserPrefs;
  notifications: NotificationPrefs;
  useOrgBranding: boolean;
  cloudSyncedAt: string | null;
}

function isCloudUser(user: SessionUser): boolean {
  return !user.id.startsWith("local-") && !user.id.startsWith("demo-");
}

function resolvePdfBrand(
  user: SessionUser,
  bundle: UserSettingsBundle,
  baseAppearance: AppearanceSettings,
): PdfBrandSettings {
  const personal = bundle.pdfBrand
    ? { ...DEFAULT_PDF_BRAND, ...bundle.pdfBrand }
    : loadPdfBrandSettings();

  const membership = findOrganizationMembership(user.email);
  const org = membership?.org ?? null;
  const forced = shouldApplyOrgBranding(
    user,
    org,
    bundle.useOrgBranding ?? true,
  );

  const merged = mergeOrgBrandingIntoPdfBrand(personal, org, forced);
  const headerColor = merged.headerColor || baseAppearance.headerColor;
  return { ...merged, headerColor };
}

export function buildSettingsBundle(state: {
  appearance: AppearanceSettings;
  pdfBrand: PdfBrandSettings;
  practiceLive: PracticeLivePrefs;
  designer: DesignerUserPrefs;
  notifications: NotificationPrefs;
  useOrgBranding: boolean;
  devices?: UserSettingsBundle["devices"];
  cloudSyncedAt?: string | null;
}): UserSettingsBundle {
  return {
    appearance: state.appearance,
    pdfBrand: state.pdfBrand,
    practiceLive: state.practiceLive,
    designer: state.designer,
    notifications: state.notifications,
    useOrgBranding: state.useOrgBranding,
    devices: state.devices,
    cloudSyncedAt: state.cloudSyncedAt ?? new Date().toISOString(),
  };
}

/** Merge cloud settings into scoped localStorage (devices included). */
export async function syncScopedSettingsFromCloud(
  user: SessionUser,
): Promise<UserSettingsBundle> {
  const local = loadScopedUserSettings(user.id);

  if (!isCloudEnabled() || !isCloudUser(user)) {
    return local;
  }

  const supabase = createClient();
  if (!supabase) return local;

  const result = await fetchCloudUserSettings(supabase, user.id);
  const merged = mergeUserSettingsBundles(
    local,
    result.ok ? (result.bundle ?? null) : null,
  );
  saveScopedUserSettings(user.id, merged);
  return merged;
}

export async function loadSettingsForUser(
  user: SessionUser,
): Promise<ResolvedUserSettings> {
  const merged = await syncScopedSettingsFromCloud(user);

  const appearance = merged.appearance
    ? { ...DEFAULT_APPEARANCE, ...merged.appearance }
    : loadAppearanceSettings();

  const membership = findOrganizationMembership(user.email);
  const useOrgBranding = Boolean(
    membership &&
      orgHasConfiguredBranding(membership.org) &&
      (merged.useOrgBranding ?? true),
  );

  const pdfBrand = resolvePdfBrand(
    user,
    { ...merged, useOrgBranding },
    appearance,
  );
  const syncedAppearance =
    appearance.headerColor !== pdfBrand.headerColor
      ? { ...appearance, headerColor: pdfBrand.headerColor }
      : appearance;

  const practiceLive = {
    ...loadPracticeLivePrefs(),
    ...merged.practiceLive,
  };

  return {
    appearance: syncedAppearance,
    pdfBrand,
    practiceLive,
    designer: { ...DEFAULT_DESIGNER_PREFS, ...merged.designer },
    notifications: { ...DEFAULT_NOTIFICATION_PREFS, ...merged.notifications },
    useOrgBranding,
    cloudSyncedAt: merged.cloudSyncedAt ?? null,
  };
}

export function persistLocalSettingsForUser(
  userId: string,
  bundle: UserSettingsBundle,
) {
  saveScopedUserSettings(userId, bundle);
  if (bundle.appearance) saveAppearanceSettings(bundle.appearance);
  if (bundle.pdfBrand) savePdfBrandSettings(bundle.pdfBrand);
  if (bundle.practiceLive) savePracticeLivePrefs(bundle.practiceLive);
}

export async function persistSettingsForUser(
  user: SessionUser,
  bundle: UserSettingsBundle,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stamped: UserSettingsBundle = {
    ...bundle,
    cloudSyncedAt: new Date().toISOString(),
  };
  persistLocalSettingsForUser(user.id, stamped);

  if (!isCloudEnabled() || !isCloudUser(user)) return { ok: true };

  const supabase = createClient();
  if (!supabase) return { ok: true };

  const devices = loadScopedUserSettings(user.id).devices ?? bundle.devices;
  return saveCloudUserSettings(supabase, user.id, { ...stamped, devices });
}
