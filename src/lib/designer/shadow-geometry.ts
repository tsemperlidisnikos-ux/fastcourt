import type { CourtRect } from "@/types/designer";

export type ShadowType = "rect" | "circle" | "triangle" | "diamond";

export const SHADOW_TYPES: ShadowType[] = ["rect", "circle", "triangle", "diamond"];

const SHADOW_REF_COURT_W = 680;
const SHADOW_SIZE_MULT = 1.2;
const SHADOW_MIN_SCALE = 0.2;
const SHADOW_MAX_SCALE = 10;

export interface ShadowDims {
  scale: number;
  rectW: number;
  rectH: number;
  rectR: number;
  circleR: number;
  triH: number;
  triHalf: number;
  diamondHalf: number;
  pad: number;
  fill: string;
}

export function getShadowDimensions(court: CourtRect): ShadowDims {
  const scale = (court.width / SHADOW_REF_COURT_W) * SHADOW_SIZE_MULT;
  return {
    scale,
    rectW: 36 * scale,
    rectH: 22 * scale,
    rectR: 4 * scale,
    circleR: 13 * scale,
    triH: 26 * scale,
    triHalf: 15 * scale,
    diamondHalf: 14 * scale,
    pad: 6 * scale,
    fill: "rgba(51, 65, 85, 0.22)",
  };
}

function getShadowBaseHalfExtents(type: ShadowType, dims: ShadowDims) {
  if (type === "circle") return { halfW: dims.circleR, halfH: dims.circleR };
  if (type === "triangle") return { halfW: dims.triHalf, halfH: dims.triH / 2 };
  if (type === "diamond") return { halfW: dims.diamondHalf, halfH: dims.diamondHalf };
  return { halfW: dims.rectW / 2, halfH: dims.rectH / 2 };
}

export function clampShadowScale(value: number) {
  return Math.max(SHADOW_MIN_SCALE, Math.min(SHADOW_MAX_SCALE, value));
}

export function computeShadowPlacementFromDrag(
  type: ShadowType,
  dims: ShadowDims,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const base = getShadowBaseHalfExtents(type, dims);
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  const halfW = Math.max(base.halfW * SHADOW_MIN_SCALE, Math.abs(x1 - x0) / 2);
  const halfH = Math.max(base.halfH * SHADOW_MIN_SCALE, Math.abs(y1 - y0) / 2);
  if (type === "rect") {
    return {
      centerX,
      centerY,
      scaleX: clampShadowScale(halfW / base.halfW),
      scaleY: clampShadowScale(halfH / base.halfH),
    };
  }
  const uniform = clampShadowScale(
    Math.max(halfW / base.halfW, halfH / base.halfH),
  );
  return { centerX, centerY, scaleX: uniform, scaleY: uniform };
}

/** Norm coords from drag; tap (< 0.012 norm) uses default 1×1 scale. */
export function shadowPlacementFromNormDrag(
  type: ShadowType,
  court: CourtRect,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const dims = getShadowDimensions(court);
  const dragDist = Math.hypot(x1 - x0, y1 - y0);
  if (dragDist < 0.012) {
    return { x: x0, y: y0, scaleX: 1, scaleY: 1 };
  }
  const stageW = court.width;
  const placement = computeShadowPlacementFromDrag(
    type,
    dims,
    x0 * stageW,
    y0 * stageW,
    x1 * stageW,
    y1 * stageW,
  );
  return {
    x: placement.centerX / stageW,
    y: placement.centerY / stageW,
    scaleX: placement.scaleX,
    scaleY: placement.scaleY,
  };
}

export function shadowNormSize(
  type: ShadowType,
  dims: ShadowDims,
  scaleX: number,
  scaleY: number,
  court: CourtRect,
) {
  const base = getShadowBaseHalfExtents(type, dims);
  const w = (base.halfW * 2 * scaleX) / court.width;
  const h = (base.halfH * 2 * scaleY) / court.width;
  return { w, h };
}
