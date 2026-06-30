import type { AppearanceSettings } from "@/types/appearance-settings";

export type CourtRenderMode = "vector" | "image";

export interface CourtColorPreset {
  id: string;
  label: string;
  floorColor: string;
  lineColor: string;
  showWoodTiles?: boolean;
  woodTextureId?: string;
}

import {
  COURT_WOOD_TEXTURE_OAK,
} from "@/lib/designer/court-assets";

export const COURT_COLOR_PRESETS: CourtColorPreset[] = [
  {
    id: "wood",
    label: "Wood",
    floorColor: "rgb(218, 179, 132)",
    lineColor: "#ffffff",
    showWoodTiles: true,
    woodTextureId: COURT_WOOD_TEXTURE_OAK.id,
  },
  {
    id: "grey",
    label: "White / Black",
    floorColor: "#ffffff",
    lineColor: "#000000",
  },
  {
    id: "white",
    label: "White",
    floorColor: "#ffffff",
    lineColor: "#94a3b8",
  },
  {
    id: "classic",
    label: "Classic",
    floorColor: "#fffaf5",
    lineColor: "#64748b",
  },
];

export function resolveCourtColors(settings: AppearanceSettings) {
  return {
    floorColor: settings.courtFloorColor,
    lineColor: settings.courtLineColor,
    renderMode: settings.courtRenderMode,
  };
}

export function courtColorsFromPreset(preset: CourtColorPreset) {
  return {
    courtFloorColor: preset.floorColor,
    courtLineColor: preset.lineColor,
    courtShowWoodTiles: preset.showWoodTiles ?? false,
  };
}

export function courtAppearanceFromPreset(preset: CourtColorPreset) {
  return {
    floorColor: preset.floorColor,
    lineColor: preset.lineColor,
    showWoodTiles: preset.showWoodTiles ?? false,
    woodTextureId: preset.woodTextureId,
  };
}
