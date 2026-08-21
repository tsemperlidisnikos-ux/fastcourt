/** Fixed layout width — matches typical laptop breakpoint used by the app CSS. */
export const LAPTOP_DESIGN_WIDTH = 1280;

export type DeviceKind = "phone" | "tablet" | "laptop" | "desktop";

export type DeviceClass = "laptop" | "desktop-wide";

export type ViewportProfile = {
  deviceKind: DeviceKind;
  deviceClass: DeviceClass;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  designWidth: number;
  scale: number;
};

const DEFAULT_VIEWPORT =
  "width=device-width, initial-scale=1, viewport-fit=cover";

export function detectDeviceKind(width: number): DeviceKind {
  if (width < 600) return "phone";
  if (width < 1024) return "tablet";
  if (width < 1440) return "laptop";
  return "desktop";
}

export function detectDeviceClass(width: number, laptopLock: boolean): DeviceClass {
  if (laptopLock) return "laptop";
  if (width >= 1600) return "desktop-wide";
  return "laptop";
}

export function computeViewportScale(viewportWidth: number): number {
  if (viewportWidth >= LAPTOP_DESIGN_WIDTH) return 1;
  return viewportWidth / LAPTOP_DESIGN_WIDTH;
}

export function buildViewportProfile(
  laptopLock: boolean,
): ViewportProfile {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  const deviceKind = detectDeviceKind(viewportWidth);
  const deviceClass = detectDeviceClass(viewportWidth, laptopLock);
  const scale = laptopLock ? computeViewportScale(viewportWidth) : 1;

  return {
    deviceKind,
    deviceClass,
    viewportWidth,
    viewportHeight,
    pixelRatio,
    designWidth: LAPTOP_DESIGN_WIDTH,
    scale,
  };
}

export function shouldEnableLaptopLock(pathname: string): boolean {
  if (pathname === "/privacy" || pathname === "/terms") {
    return false;
  }
  return true;
}

function getViewportMeta(): HTMLMetaElement | null {
  return document.querySelector('meta[name="viewport"]');
}

export function applyLaptopViewportMeta(scale: number): void {
  const meta = getViewportMeta();
  if (!meta) return;

  if (scale >= 1) {
    meta.setAttribute(
      "content",
      `width=${LAPTOP_DESIGN_WIDTH}, initial-scale=1, viewport-fit=cover`,
    );
    return;
  }

  const scaleStr = scale.toFixed(4);
  meta.setAttribute(
    "content",
    `width=${LAPTOP_DESIGN_WIDTH}, initial-scale=${scaleStr}, minimum-scale=${scaleStr}, viewport-fit=cover`,
  );
}

export function restoreDefaultViewportMeta(): void {
  const meta = getViewportMeta();
  if (!meta) return;
  meta.setAttribute("content", DEFAULT_VIEWPORT);
}

export function detectCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function applyHtmlViewportAttributes(
  profile: ViewportProfile,
  laptopLock: boolean,
): void {
  const root = document.documentElement;
  root.setAttribute("data-device-class", profile.deviceClass);
  root.setAttribute("data-device-kind", profile.deviceKind);
  root.setAttribute("data-viewport-width", String(profile.viewportWidth));
  root.setAttribute(
    "data-pointer-coarse",
    detectCoarsePointer() ? "true" : "false",
  );
  root.style.setProperty("--fc-design-width", `${profile.designWidth}px`);
  root.style.setProperty("--fc-viewport-scale", String(profile.scale));

  if (laptopLock) {
    root.setAttribute("data-layout-mode", "laptop-lock");
  } else {
    root.removeAttribute("data-layout-mode");
    root.style.removeProperty("--fc-design-width");
    root.style.removeProperty("--fc-viewport-scale");
  }
}

export function clearHtmlViewportAttributes(): void {
  const root = document.documentElement;
  root.removeAttribute("data-device-class");
  root.removeAttribute("data-device-kind");
  root.removeAttribute("data-layout-mode");
  root.removeAttribute("data-viewport-width");
  root.removeAttribute("data-pointer-coarse");
  root.style.removeProperty("--fc-design-width");
  root.style.removeProperty("--fc-viewport-scale");
}
