import type { CourtViewSettings, CourtTemplate } from "@/types/designer";
import type { AppearanceSettings } from "@/types/appearance-settings";
import {
  DEFAULT_COURT_WOOD_TEXTURE_ID,
  normalizeCourtWoodTextureId,
} from "@/lib/designer/court-assets";
import {
  COURT_COLOR_PRESETS,
  type CourtColorPreset,
} from "@/lib/settings/court-appearance";

const DEFAULT_WOOD_PRESET: CourtColorPreset =
  COURT_COLOR_PRESETS.find((p) => p.id === "wood") ?? COURT_COLOR_PRESETS[0];

export const COURT_TEMPLATE_OPTIONS: Array<{
  value: CourtTemplate;
  label: string;
  enabled: boolean;
}> = [
  { value: "NCAA", label: "NCAA", enabled: true },
  { value: "NBA", label: "NBA", enabled: true },
  { value: "HighSchool", label: "High School", enabled: true },
  { value: "FIBA", label: "FIBA", enabled: true },
];

export const COURT_FEATURE_OPTIONS: Array<{
  key: string;
  label: string;
  /** Not an HG line feature — toggles hoop markers. */
  baskets?: boolean;
}> = [
  { key: "baskets", label: "Baskets", baskets: true },
  { key: "baseline", label: "Baseline" },
  { key: "sideline", label: "Sideline" },
  { key: "paintedArea", label: "Painted Area" },
  { key: "freeThrowArc", label: "Free Throw Arc" },
  { key: "threePointLine", label: "Three Point Line" },
  { key: "centerCircle", label: "Center Circle" },
  { key: "chargingCircle", label: "Charging Circle" },
  { key: "keyHashMarks", label: "Key Hash Marks" },
  { key: "centerLine", label: "Center Line" },
];

export const DEFAULT_COURT_FEATURE_FILTERS: Record<string, boolean> =
  Object.fromEntries(
    COURT_FEATURE_OPTIONS
      .filter((o) => !o.baskets)
      .map((o) => [o.key, true]),
  );

export const COURT_SIDELINES_FT_OPTIONS = [0, 4] as const;
export const DEFAULT_COURT_SIDELINES_FT = 4;
export const DEFAULT_COURT_TEMPLATE: CourtTemplate = "FIBA";

export function normalizeSidelinesFt(ft: number): number {
  return ft >= 4 ? 4 : 0;
}

export const DEFAULT_COURT_VIEW_SETTINGS: CourtViewSettings = {
  template: DEFAULT_COURT_TEMPLATE,
  angle: 0,
  sidelinesFt: DEFAULT_COURT_SIDELINES_FT,
  showBaskets: true,
  featureFilters: { ...DEFAULT_COURT_FEATURE_FILTERS },
};

export function patchCourtViewSettings(
  current: CourtViewSettings | null | undefined,
  patch: Partial<CourtViewSettings>,
): CourtViewSettings {
  const prev = mergeCourtViewSettings(current);
  return {
    ...prev,
    ...patch,
    featureFilters: patch.featureFilters
      ? { ...prev.featureFilters, ...patch.featureFilters }
      : prev.featureFilters,
  };
}

export function mergeCourtViewSettings(
  partial?: CourtViewSettings | null,
): CourtViewSettings {
  if (!partial) return { ...DEFAULT_COURT_VIEW_SETTINGS };
  const legacy = partial as CourtViewSettings & { sidelinesM?: number };
  const rawSidelinesFt =
    partial.sidelinesFt ??
    (legacy.sidelinesM != null
      ? Math.round(legacy.sidelinesM * 3.280839895)
      : undefined);
  return {
    ...DEFAULT_COURT_VIEW_SETTINGS,
    ...partial,
    sidelinesFt: normalizeSidelinesFt(
      rawSidelinesFt ?? DEFAULT_COURT_VIEW_SETTINGS.sidelinesFt,
    ),
    featureFilters: {
      ...DEFAULT_COURT_FEATURE_FILTERS,
      ...partial.featureFilters,
    },
  };
}

export function defaultNewPlayCourtAppearance() {
  return {
    floorColor: DEFAULT_WOOD_PRESET.floorColor,
    lineColor: DEFAULT_WOOD_PRESET.lineColor,
    showWoodTiles: DEFAULT_WOOD_PRESET.showWoodTiles ?? true,
    woodTextureId:
      DEFAULT_WOOD_PRESET.woodTextureId ?? DEFAULT_COURT_WOOD_TEXTURE_ID,
  };
}

/** Default court layout + appearance for newly created plays and drills. */
export const DEFAULT_NEW_PLAY_COURT_VIEW: CourtViewSettings = {
  ...DEFAULT_COURT_VIEW_SETTINGS,
  ...defaultNewPlayCourtAppearance(),
};

export function resolvePlayCourtAppearance(
  courtView: CourtViewSettings | null | undefined,
  appearance: Pick<
    AppearanceSettings,
    "courtFloorColor" | "courtLineColor" | "courtShowWoodTiles"
  >,
) {
  const merged = mergeCourtViewSettings(courtView);
  const showWoodTiles =
    merged.showWoodTiles ?? appearance.courtShowWoodTiles;
  return {
    floorColor: merged.floorColor ?? appearance.courtFloorColor,
    lineColor: merged.lineColor ?? appearance.courtLineColor,
    showWoodTiles,
    woodTextureId: showWoodTiles
      ? normalizeCourtWoodTextureId(
          merged.woodTextureId ?? DEFAULT_COURT_WOOD_TEXTURE_ID,
        )
      : undefined,
  };
}

export function isCourtFeatureEnabled(
  settings: CourtViewSettings,
  feature: string,
) {
  if (feature === "baskets") return settings.showBaskets;
  return settings.featureFilters[feature] !== false;
}
