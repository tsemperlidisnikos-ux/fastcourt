import type { PlatformFeaturesConfig } from "@/types/platform-features";

const STORAGE_KEY = "fastcourt_platform_features_v1";

export const PLATFORM_FEATURES_STORAGE_KEY = STORAGE_KEY;
export const PLATFORM_FEATURES_CHANGED_EVENT =
  "fastcourt:platform-features-changed";

export const DEFAULT_PLATFORM_FEATURES: PlatformFeaturesConfig = {
  similarPlays: true,
  designerCoach: true,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function normalizePlatformFeatures(
  raw: unknown,
): PlatformFeaturesConfig {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PLATFORM_FEATURES };
  }
  const record = raw as Record<string, unknown>;
  return {
    similarPlays:
      typeof record.similarPlays === "boolean"
        ? record.similarPlays
        : DEFAULT_PLATFORM_FEATURES.similarPlays,
    designerCoach:
      typeof record.designerCoach === "boolean"
        ? record.designerCoach
        : DEFAULT_PLATFORM_FEATURES.designerCoach,
  };
}

export function isSimilarPlaysEnabled(
  config: PlatformFeaturesConfig = loadPlatformFeatures(),
) {
  return config.similarPlays !== false;
}

export function isDesignerCoachEnabled(
  config: PlatformFeaturesConfig = loadPlatformFeatures(),
) {
  return config.designerCoach !== false;
}

export function loadPlatformFeatures(): PlatformFeaturesConfig {
  if (!isBrowser()) return normalizePlatformFeatures(undefined);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizePlatformFeatures(undefined);
    return normalizePlatformFeatures(JSON.parse(raw));
  } catch {
    return normalizePlatformFeatures(undefined);
  }
}

export function savePlatformFeatures(config: PlatformFeaturesConfig) {
  if (!isBrowser()) return;
  const normalized = normalizePlatformFeatures(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(PLATFORM_FEATURES_CHANGED_EVENT));
}
