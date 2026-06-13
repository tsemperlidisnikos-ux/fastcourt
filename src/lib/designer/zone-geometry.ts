import type { CourtRect } from "@/types/designer";

export type ZoneType = "paint" | "lane" | "threepoint" | "halfcourt";

export const ZONE_TYPES: ZoneType[] = ["paint", "lane", "threepoint", "halfcourt"];

const SHADOW_REF_COURT_W = 680;
const SHADOW_SIZE_MULT = 1.2;
const SHADOW_MIN_SCALE = 0.2;
const SHADOW_MAX_SCALE = 10;

export const ZONE_PRESETS: Record<
  ZoneType,
  { label: string; color: string; stroke: string }
> = {
  paint: { label: "Paint", color: "rgba(239,68,68,0.18)", stroke: "#ef4444" },
  lane: { label: "Lane", color: "rgba(37,99,235,0.15)", stroke: "#2563eb" },
  threepoint: {
    label: "3PT",
    color: "rgba(34,197,94,0.15)",
    stroke: "#16a34a",
  },
  halfcourt: {
    label: "Half",
    color: "rgba(100,116,139,0.15)",
    stroke: "#64748b",
  },
};

export interface ZoneDims {
  scale: number;
  rectW: number;
  rectH: number;
  rectR: number;
  pad: number;
  fill: string;
  stroke: string;
}

export function getZoneDimensions(
  court: CourtRect,
  zoneType: ZoneType = "paint",
): ZoneDims {
  const preset = ZONE_PRESETS[zoneType] ?? ZONE_PRESETS.paint;
  const scale = (court.width / SHADOW_REF_COURT_W) * SHADOW_SIZE_MULT;
  return {
    scale,
    rectW: 36 * scale,
    rectH: 22 * scale,
    rectR: 4 * scale,
    pad: 6 * scale,
    fill: preset.color,
    stroke: preset.stroke,
  };
}

function getZoneBaseHalfExtents(dims: ZoneDims) {
  return { halfW: dims.rectW / 2, halfH: dims.rectH / 2 };
}

export function clampZoneScale(value: number) {
  return Math.max(SHADOW_MIN_SCALE, Math.min(SHADOW_MAX_SCALE, value));
}

export function computeZonePlacementFromDrag(
  dims: ZoneDims,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const base = getZoneBaseHalfExtents(dims);
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  const halfW = Math.max(base.halfW * SHADOW_MIN_SCALE, Math.abs(x1 - x0) / 2);
  const halfH = Math.max(base.halfH * SHADOW_MIN_SCALE, Math.abs(y1 - y0) / 2);
  return {
    centerX,
    centerY,
    scaleX: clampZoneScale(halfW / base.halfW),
    scaleY: clampZoneScale(halfH / base.halfH),
  };
}

export function zonePlacementFromNormDrag(
  zoneType: ZoneType,
  court: CourtRect,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const dims = getZoneDimensions(court, zoneType);
  const dragDist = Math.hypot(x1 - x0, y1 - y0);
  if (dragDist < 0.012) {
    return { x: x0, y: y0, scaleX: 1, scaleY: 1 };
  }
  const stageW = court.width;
  const placement = computeZonePlacementFromDrag(
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

export function zoneNormSize(
  dims: ZoneDims,
  scaleX: number,
  scaleY: number,
  court: CourtRect,
) {
  const base = getZoneBaseHalfExtents(dims);
  const w = (base.halfW * 2 * scaleX) / court.width;
  const h = (base.halfH * 2 * scaleY) / court.width;
  return { w, h };
}
