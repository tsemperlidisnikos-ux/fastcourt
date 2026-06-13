import {
  FD_FULL_COURT_ASPECT,
  FD_HALF_COURT_ASPECT,
} from "@/lib/designer/constants";
import type { CourtRect, CourtType } from "@/types/designer";

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
  oob: "none" | "end" | "sideline-left" | "sideline-right";
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
): CourtViewLayout {
  const courtAspect =
    courtType === "full" ? FD_FULL_COURT_ASPECT : FD_HALF_COURT_ASPECT;
  const endRatio = opts.oob === "end" ? COURT_OOB_END_RATIO : 0;
  const sideRatio =
    opts.oob === "sideline-left" || opts.oob === "sideline-right"
      ? COURT_OOB_SIDE_RATIO
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
  let courtY = totalY;
  if (endRatio > 0 && baselineAtTop) courtY = totalY + endH;

  const court = { x: courtX, y: courtY, width: courtW, height: courtH };
  const total = { x: totalX, y: totalY, width: totalW, height: totalH };
  const oobRects: CourtViewLayout["oobRects"] = [];

  if (endRatio > 0) {
    oobRects.push({
      x: courtX,
      y: baselineAtTop ? totalY : totalY + courtH,
      width: courtW,
      height: endH,
      kind: "end",
    });
  }
  if (sideRatio > 0) {
    oobRects.push({
      x: opts.oob === "sideline-left" ? totalX : courtX + courtW,
      y: courtY,
      width: sideW,
      height: courtH,
      kind: "sideline",
    });
  }

  return { court, total, oobRects, opts };
}

export function getPlayableCourtRect(
  court: CourtRect,
  courtType: CourtType,
): CourtRect {
  return insetCourtRect(court, getCourtLineInsets(courtType));
}

export function courtNormToStage(
  court: CourtRect,
  courtType: CourtType,
  nx: number,
  ny: number,
) {
  const playable = getPlayableCourtRect(court, courtType);
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
) {
  const playable = getPlayableCourtRect(court, courtType);
  return {
    x: (x - playable.x) / playable.width,
    y: (y - playable.y) / playable.height,
  };
}
