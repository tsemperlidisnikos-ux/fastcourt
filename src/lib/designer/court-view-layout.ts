import {
  getCourtAspect,
  getCourtHgTemplate,
} from "@/lib/designer/court-hg-templates";
import type { CourtRect, CourtTemplate, CourtType } from "@/types/designer";

export const COURT_OOB_END_RATIO = 0.2;
export const COURT_OOB_SIDE_RATIO = 0.16;

/** White-line inset inside court PNG (from legacy app.js). */
export const COURT_LINE_INSET_HALF = {
  left: 0.068,
  top: 0.067,
  right: 0.071,
  bottom: 0.066,
};

export const COURT_LINE_INSET_FULL = {
  left: 0.026,
  top: 0.042,
  right: 0.026,
  bottom: 0.044,
};

export interface CourtInsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CourtViewOptions {
  oob: "none" | "end" | "sideline-left" | "sideline-right" | "sideline-both";
  /** Feet of out-of-bounds on each sideline and baseline. */
  sidelinesFt?: number;
}

export interface CourtViewLayout {
  court: CourtRect;
  total: CourtRect;
  oobRects: Array<CourtRect & { kind?: string }>;
  opts: CourtViewOptions;
}

export function getCourtLineInsets(courtType: CourtType): CourtInsets {
  return courtType === "full" ? COURT_LINE_INSET_FULL : COURT_LINE_INSET_HALF;
}

export function insetCourtRect(rect: CourtRect, insets: CourtInsets): CourtRect {
  const x = rect.x + rect.width * insets.left;
  const y = rect.y + rect.height * insets.top;
  const width = rect.width * (1 - insets.left - insets.right);
  const height = rect.height * (1 - insets.top - insets.bottom);
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function getDesignerCourtFitScale(courtType: CourtType) {
  return courtType === "full" ? 0.95 : 0.9;
}

export function computeCourtViewLayout(
  stageW: number,
  stageH: number,
  courtType: CourtType,
  opts: CourtViewOptions = { oob: "none" },
  template: CourtTemplate = "NCAA",
): CourtViewLayout {
  const spec = getCourtHgTemplate(template);
  const courtAspect = getCourtAspect(template, courtType);
  const courtWidthFt = spec.widthFt;
  const playLengthFt =
    courtType === "full" ? spec.fullLengthFt : spec.fullLengthFt / 2;

  const sidelineMarginActive =
    opts.oob === "sideline-both" &&
    opts.sidelinesFt != null &&
    opts.sidelinesFt > 0;

  const sideRatio = sidelineMarginActive
    ? (opts.sidelinesFt! * 2) / courtWidthFt
    : opts.oob === "sideline-left" || opts.oob === "sideline-right"
      ? COURT_OOB_SIDE_RATIO
      : 0;

  const endRatio = sidelineMarginActive
    ? courtType === "full"
      ? (opts.sidelinesFt! * 2) / spec.fullLengthFt
      : opts.sidelinesFt! / playLengthFt
    : opts.oob === "end"
      ? COURT_OOB_END_RATIO
      : 0;

  const totalAspect = (courtAspect * (1 + sideRatio)) / (1 + endRatio);

  let totalW = stageW;
  let totalH = stageW / totalAspect;
  if (totalH > stageH) {
    totalH = stageH;
    totalW = stageH * totalAspect;
  }

  const fitScale = getDesignerCourtFitScale(courtType);
  totalW *= fitScale;
  totalH *= fitScale;
  if (totalW > stageW || totalH > stageH) {
    const shrink = Math.min(stageW / totalW, stageH / totalH);
    totalW *= shrink;
    totalH *= shrink;
  }

  const courtW = totalW / (1 + sideRatio);
  const courtH = totalH / (1 + endRatio);
  const sideW = totalW - courtW;
  const endH = totalH - courtH;
  const totalX = (stageW - totalW) / 2;
  let totalY = (stageH - totalH) / 2;
  if (courtType !== "full" && totalH < stageH - 6) {
    totalY = (stageH - totalH) * 0.62;
  }

  let courtX = totalX + sideW / 2;
  if (opts.oob === "sideline-left") courtX = totalX + sideW;
  else if (opts.oob === "sideline-right") courtX = totalX;

  const baselineAtTop = courtType !== "full";
  const symmetricEndMargins = sidelineMarginActive && courtType === "full";
  const endBandH = symmetricEndMargins ? endH / 2 : endH;

  let courtY = totalY;
  if (endRatio > 0 && baselineAtTop) courtY = totalY + endBandH;
  else if (symmetricEndMargins) courtY = totalY + endBandH;

  const court = { x: courtX, y: courtY, width: courtW, height: courtH };
  const total = { x: totalX, y: totalY, width: totalW, height: totalH };
  const oobRects: CourtViewLayout["oobRects"] = [];

  if (endRatio > 0) {
    if (symmetricEndMargins) {
      oobRects.push({
        x: courtX,
        y: totalY,
        width: courtW,
        height: endBandH,
        kind: "end",
      });
      oobRects.push({
        x: courtX,
        y: courtY + courtH,
        width: courtW,
        height: endBandH,
        kind: "end",
      });
    } else {
      oobRects.push({
        x: courtX,
        y: baselineAtTop ? totalY : totalY + courtH,
        width: courtW,
        height: endBandH,
        kind: "end",
      });
    }
  }
  if (sideRatio > 0) {
    if (opts.oob === "sideline-both") {
      oobRects.push({
        x: totalX,
        y: courtY,
        width: sideW / 2,
        height: courtH,
        kind: "sideline",
      });
      oobRects.push({
        x: courtX + courtW,
        y: courtY,
        width: sideW / 2,
        height: courtH,
        kind: "sideline",
      });
    } else {
      oobRects.push({
        x: opts.oob === "sideline-left" ? totalX : courtX + courtW,
        y: courtY,
        width: sideW,
        height: courtH,
        kind: "sideline",
      });
    }
  }

  return { court, total, oobRects, opts };
}

export type CourtCoordSpace = "vector" | "raster";

export function getPlayableCourtRect(
  court: CourtRect,
  courtType: CourtType,
  coords: CourtCoordSpace = "raster",
): CourtRect {
  if (coords === "vector") return court;
  return insetCourtRect(court, getCourtLineInsets(courtType));
}

export function courtNormToStage(
  court: CourtRect,
  courtType: CourtType,
  nx: number,
  ny: number,
  coords: CourtCoordSpace = "raster",
) {
  const playable = getPlayableCourtRect(court, courtType, coords);
  return {
    x: playable.x + nx * playable.width,
    y: playable.y + ny * playable.height,
  };
}

export function stageToCourtNorm(
  court: CourtRect,
  courtType: CourtType,
  x: number,
  y: number,
  coords: CourtCoordSpace = "raster",
) {
  const playable = getPlayableCourtRect(court, courtType, coords);
  return {
    x: (x - playable.x) / playable.width,
    y: (y - playable.y) / playable.height,
  };
}

export interface PlacementNormBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Court-norm bounds for players/objects when OOB margins are enabled. */
export function getPlacementNormBounds(
  layout: CourtViewLayout,
  courtType: CourtType,
  coords: CourtCoordSpace = "vector",
): PlacementNormBounds {
  if (coords !== "vector" || layout.oobRects.length === 0) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  const { court, total } = layout;
  const marginLeft = court.x - total.x;
  const marginTop = court.y - total.y;
  const marginRight = total.x + total.width - court.x - court.width;
  const marginBottom = total.y + total.height - court.y - court.height;

  return {
    minX: -marginLeft / court.width,
    minY: -marginTop / court.height,
    maxX: 1 + marginRight / court.width,
    maxY: 1 + marginBottom / court.height,
  };
}

export function clampPlacementNorm(
  layout: CourtViewLayout,
  courtType: CourtType,
  x: number,
  y: number,
  coords: CourtCoordSpace = "vector",
) {
  const bounds = getPlacementNormBounds(layout, courtType, coords);
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}

export function placementNormToStage(
  layout: CourtViewLayout,
  courtType: CourtType,
  nx: number,
  ny: number,
  coords: CourtCoordSpace = "vector",
) {
  const { court } = layout;
  const origin = getPlayableCourtRect(court, courtType, coords);
  return {
    x: origin.x + nx * court.width,
    y: origin.y + ny * court.height,
  };
}

export function stageToPlacementNorm(
  layout: CourtViewLayout,
  courtType: CourtType,
  x: number,
  y: number,
  coords: CourtCoordSpace = "vector",
) {
  const { court } = layout;
  const origin = getPlayableCourtRect(court, courtType, coords);
  return {
    x: (x - origin.x) / court.width,
    y: (y - origin.y) / court.height,
  };
}
