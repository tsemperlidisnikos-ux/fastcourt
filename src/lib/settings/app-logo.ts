import { APP_LOGO_PATH } from "@/lib/config";

const LOGO_STORAGE_KEY = "fastcourt_app_logo_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadAppLogoDataUrl(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveAppLogoDataUrl(dataUrl: string | null): boolean {
  if (!isBrowser()) return false;
  try {
    if (dataUrl?.trim()) {
      localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    } else {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveAppLogoSrc(customDataUrl: string | null | undefined): string {
  const custom = customDataUrl?.trim();
  return custom || APP_LOGO_PATH;
}
