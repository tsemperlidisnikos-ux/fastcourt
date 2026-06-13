import { ACTION_COLORS } from "@/lib/designer/action-constants";
import type { AppearanceSettings, ActionColorKey } from "@/types/appearance-settings";

const STORAGE_KEY = "fastcourt_appearance_v1";

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  panelAccent: "#16a34a",
  utilityBar: "#16a34a",
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
  appFont: "system-ui",
  theme: "light",
  playerDisplay: "number",
  allowFingerDraw: true,
  highContrastCourt: false,
  libraryColumns: {
    tableFont: 12,
    season: null,
    listSplitPct: 44,
    team: null,
    series: null,
    tags: null,
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
  { value: "system-ui", label: "System UI (recommended)" },
  { value: "Segoe UI", label: "Segoe UI" },
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
];

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadAppearanceSettings(): AppearanceSettings {
  if (!isBrowser()) return { ...DEFAULT_APPEARANCE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    const parsed = JSON.parse(raw) as AppearanceSettings;
    return {
      ...DEFAULT_APPEARANCE,
      ...parsed,
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
