import {
  DEFAULT_APP_FONT,
  LEGACY_DEFAULT_APP_FONT,
  PREVIOUS_DEFAULT_APP_FONT,
} from "@/lib/config";
import { ACTION_COLORS } from "@/lib/designer/action-constants";
import {
  COURT_COLOR_PRESETS,
  courtColorsFromPreset,
} from "@/lib/settings/court-appearance";
import type { AppearanceSettings, ActionColorKey } from "@/types/appearance-settings";

const STORAGE_KEY = "fastcourt_appearance_v1";
const FONT_MIGRATION_KEY = "fastcourt_font_migrated_calibri_v1";
const PUCK_FONT_MIGRATION_KEY = "fastcourt_font_migrated_puck_bold_v1";

const DEFAULT_COURT_PRESET =
  COURT_COLOR_PRESETS.find((p) => p.id === "wood") ?? COURT_COLOR_PRESETS[0];

export const HEADER_NAV_TAB_FONT_MIN = 11;
export const HEADER_NAV_TAB_FONT_MAX = 24;
export const DEFAULT_HEADER_NAV_TAB_FONT_SIZE = 16;

export function sanitizeHeaderNavTabFontSize(val: number | undefined): number {
  const n = Math.round(val ?? DEFAULT_HEADER_NAV_TAB_FONT_SIZE);
  if (!Number.isFinite(n)) return DEFAULT_HEADER_NAV_TAB_FONT_SIZE;
  return Math.min(
    HEADER_NAV_TAB_FONT_MAX,
    Math.max(HEADER_NAV_TAB_FONT_MIN, n),
  );
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  actionColors: {
    cut: "#000000",
    pass: "#000000",
    dribble: "#000000",
    screen: "#000000",
    curl: "#000000",
    handoff: "#000000",
    label: "#000000",
    shoot: "#16a34a",
  },
  headerColor: "#000000",
  headerBrandRowColor: "#000000",
  headerNavActiveColor: "#16a34a",
  headerNavTabFontSize: DEFAULT_HEADER_NAV_TAB_FONT_SIZE,
  appFont: DEFAULT_APP_FONT,
  theme: "light",
  playerDisplay: "number",
  allowFingerDraw: true,
  highContrastCourt: false,
  ...courtColorsFromPreset(DEFAULT_COURT_PRESET),
  courtRenderMode: "vector",
  libraryColumns: {
    tableFont: 14,
    season: 20,
    type: 50,
    listSplitPct: 60,
    team: 300,
    series: 220,
    tags: 400,
  },
  libraryFramesGrid: {
    columns: 3,
    gap: 20,
  },
  designerColumns: {
    tools: 380,
    court: null,
    notes: 300,
    frames: 207,
    tableFont: 15,
  },
};

export const ACTION_COLOR_LABELS: Record<ActionColorKey, string> = {
  cut: "Cut",
  pass: "Pass",
  dribble: "Dribble",
  screen: "Screen",
  curl: "Curl",
  handoff: "Hand-off",
  label: "Text / Label",
  shoot: "Shot",
};

export const APP_FONT_OPTIONS = [
  { value: DEFAULT_APP_FONT, label: "Puck Bold (default)" },
  { value: PREVIOUS_DEFAULT_APP_FONT, label: "Calibri" },
  { value: LEGACY_DEFAULT_APP_FONT, label: "Arial Rounded MT" },
  { value: "system-ui", label: "System UI" },
  { value: "Segoe UI", label: "Segoe UI" },
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
];

export function normalizeAppFont(appFont: string | undefined): string {
  return appFont?.trim() || DEFAULT_APP_FONT;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadAppearanceSettings(): AppearanceSettings {
  if (!isBrowser()) return { ...DEFAULT_APPEARANCE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    const parsed = JSON.parse(raw) as AppearanceSettings & {
      panelAccent?: string;
      utilityBar?: string;
    };
    let appFont = normalizeAppFont(parsed.appFont);
    if (!localStorage.getItem(FONT_MIGRATION_KEY)) {
      if (
        appFont === LEGACY_DEFAULT_APP_FONT ||
        appFont === "Arial Rounded MT Regular"
      ) {
        appFont = PREVIOUS_DEFAULT_APP_FONT;
      }
      localStorage.setItem(FONT_MIGRATION_KEY, "1");
    }
    if (!localStorage.getItem(PUCK_FONT_MIGRATION_KEY)) {
      if (
        appFont === PREVIOUS_DEFAULT_APP_FONT ||
        appFont === LEGACY_DEFAULT_APP_FONT ||
        appFont === "Arial Rounded MT Regular"
      ) {
        appFont = DEFAULT_APP_FONT;
      }
      localStorage.setItem(PUCK_FONT_MIGRATION_KEY, "1");
    }
    return {
      ...DEFAULT_APPEARANCE,
      ...parsed,
      appFont,
      headerBrandRowColor:
        parsed.headerBrandRowColor ??
        parsed.headerColor ??
        DEFAULT_APPEARANCE.headerBrandRowColor,
      headerNavActiveColor:
        parsed.headerNavActiveColor ??
        parsed.panelAccent ??
        DEFAULT_APPEARANCE.headerNavActiveColor,
      headerNavTabFontSize: sanitizeHeaderNavTabFontSize(
        parsed.headerNavTabFontSize,
      ),
      actionColors: {
        ...DEFAULT_APPEARANCE.actionColors,
        ...parsed.actionColors,
      },
      libraryColumns: {
        ...DEFAULT_APPEARANCE.libraryColumns,
        ...parsed.libraryColumns,
      },
      libraryFramesGrid: {
        ...DEFAULT_APPEARANCE.libraryFramesGrid,
        ...parsed.libraryFramesGrid,
      },
      designerColumns: {
        ...DEFAULT_APPEARANCE.designerColumns,
        ...parsed.designerColumns,
      },
      courtFloorColor:
        parsed.courtFloorColor ?? DEFAULT_APPEARANCE.courtFloorColor,
      courtLineColor:
        parsed.courtLineColor ?? DEFAULT_APPEARANCE.courtLineColor,
      courtRenderMode:
        parsed.courtRenderMode ?? DEFAULT_APPEARANCE.courtRenderMode,
      courtShowWoodTiles:
        parsed.courtShowWoodTiles ??
        ((parsed.courtFloorColor === "rgb(219, 192, 151)" ||
          parsed.courtFloorColor === "rgb(214, 188, 148)" ||
          parsed.courtFloorColor === "rgb(218, 179, 132)")
          ? true
          : DEFAULT_APPEARANCE.courtShowWoodTiles),
      playerDisplay: "number",
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearanceSettings(settings: AppearanceSettings) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resetActionColors(
  settings: AppearanceSettings,
): AppearanceSettings {
  return {
    ...settings,
    actionColors: {
      ...DEFAULT_APPEARANCE.actionColors,
      cut: ACTION_COLORS.cut,
      pass: ACTION_COLORS.pass,
      dribble: ACTION_COLORS.dribble,
      screen: ACTION_COLORS.screen,
      curl: ACTION_COLORS.curl,
      handoff: ACTION_COLORS.handoff,
      shoot: ACTION_COLORS.shoot,
      label: "#000000",
    },
  };
}
