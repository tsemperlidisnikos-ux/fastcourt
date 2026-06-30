const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/i.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return ios && webkit && notOther;
}

export function isDismissed(key: string): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at < DISMISS_MS;
}

export function dismissBanner(key: string): void {
  localStorage.setItem(key, String(Date.now()));
}

export const PWA_INSTALL_DISMISS_KEY = "fc-pwa-install-dismissed-at";
export const PWA_IOS_HINT_DISMISS_KEY = "fc-pwa-ios-hint-dismissed-at";
