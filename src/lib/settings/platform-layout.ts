import { DEFAULT_APPEARANCE } from "@/lib/settings/appearance-settings";
import type { AppearanceSettings } from "@/types/appearance-settings";
import type { PlatformLayoutSettings } from "@/types/platform-layout";

const STORAGE_KEY = "fastcourt_platform_layout_v1";

export const PLATFORM_LAYOUT_STORAGE_KEY = STORAGE_KEY;
export const PLATFORM_LAYOUT_CHANGED_EVENT = "fastcourt:platform-layout-changed";

export const DEFAULT_PLATFORM_LAYOUT: PlatformLayoutSettings = {
  libraryColumns: { ...DEFAULT_APPEARANCE.libraryColumns },
  libraryFramesGrid: { ...DEFAULT_APPEARANCE.libraryFramesGrid },
  designerColumns: { ...DEFAULT_APPEARANCE.designerColumns },
  updatedAt: new Date(0).toISOString(),
};

function isBrowser() {
  return typeof window !== "undefined";
}

function clampFramesGrid(
  raw: Partial<PlatformLayoutSettings["libraryFramesGrid"]> | undefined,
): PlatformLayoutSettings["libraryFramesGrid"] {
  const columns = Math.min(
    6,
    Math.max(1, Math.round(Number(raw?.columns)) || DEFAULT_APPEARANCE.libraryFramesGrid.columns),
  );
  const gap = Math.min(
    32,
    Math.max(4, Math.round(Number(raw?.gap)) || DEFAULT_APPEARANCE.libraryFramesGrid.gap),
  );
  return { columns, gap };
}

export function normalizePlatformLayout(raw: unknown): PlatformLayoutSettings {
  const record =
    raw && typeof raw === "object" ? (raw as Partial<PlatformLayoutSettings>) : {};
  return {
    libraryColumns: {
      ...DEFAULT_APPEARANCE.libraryColumns,
      ...(record.libraryColumns ?? {}),
    },
    libraryFramesGrid: clampFramesGrid(record.libraryFramesGrid),
    designerColumns: {
      ...DEFAULT_APPEARANCE.designerColumns,
      ...(record.designerColumns ?? {}),
    },
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt
        ? record.updatedAt
        : new Date().toISOString(),
  };
}

export function extractPlatformLayout(
  appearance: AppearanceSettings,
): PlatformLayoutSettings {
  return normalizePlatformLayout({
    libraryColumns: appearance.libraryColumns,
    libraryFramesGrid: appearance.libraryFramesGrid,
    designerColumns: appearance.designerColumns,
    updatedAt: new Date().toISOString(),
  });
}

export function applyPlatformLayoutToAppearance(
  appearance: AppearanceSettings,
  layout: PlatformLayoutSettings | null | undefined,
): AppearanceSettings {
  if (!layout) return appearance;
  const normalized = normalizePlatformLayout(layout);
  return {
    ...appearance,
    libraryColumns: { ...normalized.libraryColumns },
    libraryFramesGrid: { ...normalized.libraryFramesGrid },
    designerColumns: { ...normalized.designerColumns },
  };
}

export function loadPlatformLayout(): PlatformLayoutSettings | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizePlatformLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePlatformLayout(layout: PlatformLayoutSettings): boolean {
  if (!isBrowser()) return false;
  try {
    const next = normalizePlatformLayout({
      ...layout,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PLATFORM_LAYOUT_CHANGED_EVENT));
    return true;
  } catch {
    return false;
  }
}
