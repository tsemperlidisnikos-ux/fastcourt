import type { CSSProperties } from "react";
import {
  resolveCourtWoodTexture,
  type CourtWoodTextureId,
} from "@/lib/designer/court-assets";
import { woodFloorPatternScale } from "@/lib/designer/court-wood-tiles";

export function courtWoodPatternTilePx(
  textureId: string | null | undefined,
  floorSpanPx: number,
) {
  const spec = resolveCourtWoodTexture(textureId);
  const scale = woodFloorPatternScale(spec.naturalWidth, floorSpanPx);
  return spec.naturalWidth * scale;
}

export function courtWoodPatternCssStyle(
  textureId: string | null | undefined,
  floorSpanPx: number,
  floorColor: string,
): CSSProperties {
  const spec = resolveCourtWoodTexture(textureId);
  const tilePx = courtWoodPatternTilePx(textureId, floorSpanPx);
  return {
    backgroundImage: `url(${spec.path})`,
    backgroundRepeat: "repeat",
    backgroundSize: `${tilePx}px auto`,
    backgroundColor: floorColor,
  };
}

export function courtWoodSwatchCssStyle(
  preset: {
    floorColor: string;
    showWoodTiles?: boolean;
    woodTextureId?: string;
  },
  swatchWidthPx = 36,
): CSSProperties {
  if (!preset.showWoodTiles || !preset.woodTextureId) {
    return { backgroundColor: preset.floorColor };
  }
  return courtWoodPatternCssStyle(
    preset.woodTextureId,
    swatchWidthPx * 4,
    preset.floorColor,
  );
}

export function courtWoodUnderlayInnerSize(
  textureId: CourtWoodTextureId | string | null | undefined,
  width: number,
  height: number,
) {
  const spec = resolveCourtWoodTexture(textureId);
  if (spec.rotation !== 0) {
    return { width: height, height: width, rotate: true as const };
  }
  return { width, height, rotate: false as const };
}
