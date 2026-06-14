import type { UserSettingsBundle } from "@/types/user-settings";
import {
  DEFAULT_DESIGNER_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/types/user-settings";

function scopedKey(base: string, userId: string | null) {
  if (!userId || userId.startsWith("local-") || userId.startsWith("demo-")) {
    return base;
  }
  return `${base}:${userId}`;
}

const BUNDLE_KEY = "fastcourt_user_settings_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadScopedUserSettings(userId: string | null): UserSettingsBundle {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(scopedKey(BUNDLE_KEY, userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UserSettingsBundle;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveScopedUserSettings(userId: string | null, bundle: UserSettingsBundle) {
  if (!isBrowser()) return;
  localStorage.setItem(scopedKey(BUNDLE_KEY, userId), JSON.stringify(bundle));
}

export function mergeUserSettingsBundles(
  local: UserSettingsBundle,
  cloud: UserSettingsBundle | null,
): UserSettingsBundle {
  if (!cloud) return local;

  const localTime = local.cloudSyncedAt ? new Date(local.cloudSyncedAt).getTime() : 0;
  const cloudTime = cloud.cloudSyncedAt ? new Date(cloud.cloudSyncedAt).getTime() : 0;
  const cloudWins = cloudTime >= localTime;

  const mergePrefs = <T extends object>(defaults: T, a?: T, b?: T): T => ({
    ...defaults,
    ...(cloudWins ? a : b),
    ...(cloudWins ? b : a),
  });

  if (cloudWins) {
    return {
      ...local,
      ...cloud,
      designer: mergePrefs(DEFAULT_DESIGNER_PREFS, local.designer, cloud.designer),
      notifications: mergePrefs(
        DEFAULT_NOTIFICATION_PREFS,
        local.notifications,
        cloud.notifications,
      ),
    };
  }

  return {
    ...cloud,
    ...local,
    designer: mergePrefs(DEFAULT_DESIGNER_PREFS, cloud.designer, local.designer),
    notifications: mergePrefs(
      DEFAULT_NOTIFICATION_PREFS,
      cloud.notifications,
      local.notifications,
    ),
  };
}
