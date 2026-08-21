import {
  ACTION_COLORS,
  DEFAULT_ARROW_STROKE,
  DRIBBLE_WAVE_AMPLITUDE,
  DRIBBLE_WAVE_LENGTH,
} from "@/lib/designer/action-constants";
import {
  courtNormToStage,
  getPlayableCourtRect,
  stageToCourtNorm,
  type CourtCoordSpace,
} from "@/lib/designer/court-view-layout";
import type { ActionType, CourtRect, CourtType, DesignerAction } from "@/types/designer";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export interface ActionDraft {
  type: ActionType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX?: number;
  midY?: number;
  c1x?: number;
  c1y?: number;
  c2x?: number;
  c2y?: number;
  points?: number[];
}

const CURVE_STRAIGHT_RATIO = 0.1;

function chordPerpendicularUnit(sx: number, sy: number, ex: number, ey: number) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  return {
    dx,
    dy,
    nx: -dy / len,
    ny: dx / len,
  };
}

export function pointBulgeFromChord(
  px: number,
  py: number,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
) {
  const { nx, ny } = chordPerpendicularUnit(sx, sy, ex, ey);
  return (px - sx) * nx + (py - sy) * ny;
}

function isNearlyStraightBulge(bulge: number, chordLen: number) {
  return Math.abs(bulge) / (chordLen || 1) < CURVE_STRAIGHT_RATIO;
}

function bulgeForSymmetricRender(
  bulge: number,
  chordLen: number,
  actionType: ActionType = "cut",
) {
  if (isNearlyStraightBulge(bulge, chordLen)) return 0;
  if (chordLen < 0.01) return bulge;
  const minRatio = actionType === "curl" ? 0.1 : 0.06;
  const min = chordLen * minRatio;
  if (Math.abs(bulge) < min) return Math.sign(bulge || 1) * min;
  return bulge;
}

export function buildSymmetricCurveControls(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  bulge: number,
  actionType: ActionType,
) {
  const { nx, ny, dx, dy } = chordPerpendicularUnit(sx, sy, ex, ey);
  if (actionType === "curl") {
    const b = Math.abs(bulge) || Math.hypot(dx, dy) * 0.14;
    const sign = Math.sign(bulge) || 1;
    return {
      c1x: sx + dx * 0.33 + nx * b * sign,
      c1y: sy + dy * 0.33 + ny * b * sign,
      c2x: sx + dx * 0.66 - nx * b * sign,
      c2y: sy + dy * 0.66 - ny * b * sign,
    };
  }
  return {
    c1x: sx + dx / 3 + nx * bulge,
    c1y: sy + dy / 3 + ny * bulge,
    c2x: sx + (dx * 2) / 3 + nx * bulge,
    c2y: sy + (dy * 2) / 3 + ny * bulge,
  };
}

export function symmetrizeArrowControls(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  actionType: ActionType,
  flatBulge: number | null = null,
) {
  const avgBulge =
    (pointBulgeFromChord(c1x, c1y, sx, sy, ex, ey) +
      pointBulgeFromChord(c2x, c2y, sx, sy, ex, ey)) /
    2;
  const bulge =
    flatBulge != null && Math.abs(flatBulge) > 0.002 ? flatBulge : avgBulge;
  return buildSymmetricCurveControls(sx, sy, ex, ey, bulge, actionType);
}

export function symmetrizeControlPoints8(
  controls8: number[],
  actionType: ActionType = "cut",
) {
  const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = controls8;
  const curveType = actionType === "screen" ? "cut" : actionType;
  const sym = symmetrizeArrowControls(
    sx,
    sy,
    ex,
    ey,
    c1x,
    c1y,
    c2x,
    c2y,
    curveType,
  );
  return [sx, sy, sym.c1x, sym.c1y, sym.c2x, sym.c2y, ex, ey];
}

export function symmetrizeDribbleMid(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  mx: number,
  my: number,
) {
  const cx = (sx + ex) / 2;
  const cy = (sy + ey) / 2;
  const { nx, ny } = chordPerpendicularUnit(sx, sy, ex, ey);
  const bulge = (mx - cx) * nx + (my - cy) * ny;
  return { mx: cx + nx * bulge, my: cy + ny * bulge };
}

function sampleQuadraticBezier(
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  ex: number,
  ey: number,
  steps: number,
) {
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push(
      u * u * sx + 2 * u * t * cx + t * t * ex,
      u * u * sy + 2 * u * t * cy + t * t * ey,
    );
  }
  return out;
}

function sampleCubicBezier(
  sx: number,
  sy: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  ex: number,
  ey: number,
  steps: number,
) {
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push(
      u * u * u * sx +
        3 * u * u * t * c1x +
        3 * u * t * t * c2x +
        t * t * t * ex,
      u * u * u * sy +
        3 * u * u * t * c1y +
        3 * u * t * t * c2y +
        t * t * t * ey,
    );
  }
  return out;
}

function sampleSymmetricCutPoints(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  bulge: number,
) {
  if (Math.abs(bulge) < 0.0005) return [sx, sy, ex, ey];
  const { nx, ny } = chordPerpendicularUnit(sx, sy, ex, ey);
  const cx = (sx + ex) / 2 + nx * bulge * 2;
  const cy = (sy + ey) / 2 + ny * bulge * 2;
  const steps = Math.max(28, Math.ceil(Math.hypot(ex - sx, ey - sy) * 120));
  return sampleQuadraticBezier(sx, sy, cx, cy, ex, ey, steps);
}

function sampleSymmetricCurlPoints(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  bulge: number,
) {
  const { c1x, c1y, c2x, c2y } = buildSymmetricCurveControls(
    sx,
    sy,
    ex,
    ey,
    bulge,
    "curl",
  );
  const steps = Math.max(32, Math.ceil(Math.hypot(ex - sx, ey - sy) * 120));
  return sampleCubicBezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey, steps);
}

/** Quadratic control so the curve passes through peak at t = 0.5. */
export function quadraticControlFromMidPassThrough(
  sx: number,
  sy: number,
  peakX: number,
  peakY: number,
  ex: number,
  ey: number,
) {
  return {
    mx: 2 * peakX - 0.5 * sx - 0.5 * ex,
    my: 2 * peakY - 0.5 * sy - 0.5 * ey,
  };
}

function sampleCurveFromFreePeak(
  sx: number,
  sy: number,
  peakX: number,
  peakY: number,
  ex: number,
  ey: number,
  actionType: ActionType,
) {
  const chordLen = Math.hypot(ex - sx, ey - sy);
  const steps = Math.max(
    28,
    Math.ceil(chordLen * (actionType === "curl" ? 120 : 100)),
  );

  if (actionType === "curl") {
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const vx = (peakX - mx) * 2;
    const vy = (peakY - my) * 2;
    const dx = ex - sx;
    const dy = ey - sy;
    const c1x = sx + dx * 0.33 + vx;
    const c1y = sy + dy * 0.33 + vy;
    const c2x = sx + dx * 0.66 - vx;
    const c2y = sy + dy * 0.66 - vy;
    return sampleCubicBezier(sx, sy, c1x, c1y, c2x, c2y, ex, ey, steps);
  }

  const { mx, my } = quadraticControlFromMidPassThrough(
    sx,
    sy,
    peakX,
    peakY,
    ex,
    ey,
  );
  return sampleQuadraticBezier(sx, sy, mx, my, ex, ey, steps);
}

export function hasFreeCurvePeak(
  action: Pick<DesignerAction, "type" | "midX" | "midY">,
) {
  return (
    action.midX != null &&
    action.midY != null &&
    usesSymmetricCurveControls(action.type)
  );
}

export function buildActionCurveRenderPoints(
  action: Pick<
    DesignerAction,
    "type" | "x1" | "y1" | "x2" | "y2" | "midX" | "midY" | "c1x" | "c1y" | "c2x" | "c2y"
  >,
): number[] {
  const sx = action.x1;
  const sy = action.y1;
  const ex = action.x2;
  const ey = action.y2;

  if (hasFreeCurvePeak(action)) {
    return sampleCurveFromFreePeak(
      sx,
      sy,
      action.midX!,
      action.midY!,
      ex,
      ey,
      action.type,
    );
  }

  return buildSampledCurveRender(resolveActionControls8(action), action.type)
    .renderPts;
}

/** Draggable peak on the curve (normalized coords). */
export function actionCurvePeakNorm(
  action: Pick<DesignerAction, "type" | "x1" | "y1" | "x2" | "y2" | "midX" | "midY">,
): { x: number; y: number } {
  if (action.midX != null && action.midY != null) {
    return { x: action.midX, y: action.midY };
  }
  return {
    x: (action.x1 + action.x2) / 2,
    y: (action.y1 + action.y2) / 2,
  };
}

export function usesSymmetricCurveControls(type: ActionType) {
  return type === "cut" || type === "curl" || type === "screen";
}

export function curveTypeForAction(type: ActionType): ActionType {
  return type === "screen" ? "cut" : type;
}

export function buildSampledCurveRender(
  controls8: number[],
  actionType: ActionType,
) {
  const controls = symmetrizeControlPoints8(controls8, actionType);
  const [sx, sy, c1x, c1y, , , ex, ey] = controls;
  const chordLen = Math.hypot(ex - sx, ey - sy);
  let renderPts: number[];
  if (actionType === "curl") {
    const b1 = pointBulgeFromChord(c1x, c1y, sx, sy, ex, ey);
    const sign = Math.sign(b1) || 1;
    const bulge = bulgeForSymmetricRender(Math.abs(b1), chordLen, "curl") * sign;
    renderPts = sampleSymmetricCurlPoints(sx, sy, ex, ey, bulge);
  } else {
    const bulge = bulgeForSymmetricRender(
      pointBulgeFromChord(c1x, c1y, sx, sy, ex, ey),
      chordLen,
      "cut",
    );
    renderPts = sampleSymmetricCutPoints(sx, sy, ex, ey, bulge);
  }
  return { controls, renderPts };
}

export function resolveActionControls8(
  action: Pick<
    DesignerAction,
    "type" | "x1" | "y1" | "x2" | "y2" | "c1x" | "c1y" | "c2x" | "c2y" | "midX" | "midY"
  >,
) {
  const sx = action.x1;
  const sy = action.y1;
  const ex = action.x2;
  const ey = action.y2;
  const curveType = curveTypeForAction(action.type);

  if (
    action.c1x != null &&
    action.c1y != null &&
    action.c2x != null &&
    action.c2y != null
  ) {
    return symmetrizeControlPoints8(
      [sx, sy, action.c1x, action.c1y, action.c2x, action.c2y, ex, ey],
      action.type,
    );
  }

  if (
    action.midX != null &&
    action.midY != null &&
    usesSymmetricCurveControls(action.type)
  ) {
    return [sx, sy, action.c1x ?? sx, action.c1y ?? sy, action.c2x ?? ex, action.c2y ?? ey, ex, ey];
  }

  const { c1x, c1y, c2x, c2y } = buildSymmetricCurveControls(
    sx,
    sy,
    ex,
    ey,
    0,
    curveType,
  );
  return [sx, sy, c1x, c1y, c2x, c2y, ex, ey];
}

export function controls8ToActionPatch(
  controls8: number[],
): Pick<
  DesignerAction,
  "x1" | "y1" | "x2" | "y2" | "c1x" | "c1y" | "c2x" | "c2y" | "midX" | "midY"
> {
  const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = controls8;
  return {
    x1: sx,
    y1: sy,
    x2: ex,
    y2: ey,
    c1x,
    c1y,
    c2x,
    c2y,
    midX: (c1x + c2x) / 2,
    midY: (c1y + c2y) / 2,
  };
}

export function patchFromControlDrag(
  action: DesignerAction,
  kind: "start" | "end" | "c1" | "c2" | "peak" | "mid",
  nx: number,
  ny: number,
): Partial<DesignerAction> {
  const controls = resolveActionControls8(action);
  const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = controls;
  const curveType = curveTypeForAction(action.type);

  if (kind === "start") {
    if (action.type === "dribble" || action.type === "handoff") {
      return { x1: nx, y1: ny };
    }
    if (usesSymmetricCurveControls(action.type)) {
      const patch = controls8ToActionPatch([nx, ny, c1x, c1y, c2x, c2y, ex, ey]);
      if (hasFreeCurvePeak(action)) {
        return { ...patch, midX: action.midX, midY: action.midY };
      }
      return patch;
    }
    return { x1: nx, y1: ny };
  }

  if (kind === "end") {
    if (action.type === "dribble" || action.type === "handoff") {
      return { x2: nx, y2: ny };
    }
    if (usesSymmetricCurveControls(action.type)) {
      const patch = controls8ToActionPatch([sx, sy, c1x, c1y, c2x, c2y, nx, ny]);
      if (hasFreeCurvePeak(action)) {
        return { ...patch, midX: action.midX, midY: action.midY };
      }
      return patch;
    }
    return { x2: nx, y2: ny };
  }

  if (kind === "c1") {
    const sym = symmetrizeArrowControls(sx, sy, ex, ey, nx, ny, c2x, c2y, curveType);
    return controls8ToActionPatch([sx, sy, sym.c1x, sym.c1y, sym.c2x, sym.c2y, ex, ey]);
  }

  if (kind === "c2") {
    const sym = symmetrizeArrowControls(sx, sy, ex, ey, c1x, c1y, nx, ny, curveType);
    return controls8ToActionPatch([sx, sy, sym.c1x, sym.c1y, sym.c2x, sym.c2y, ex, ey]);
  }

  if (kind === "peak" || kind === "mid") {
    return { midX: nx, midY: ny };
  }

  return {};
}

export function translateDesignerAction(
  action: DesignerAction,
  dx: number,
  dy: number,
): Partial<DesignerAction> {
  const patch: Partial<DesignerAction> = {
    x1: clamp01(action.x1 + dx),
    y1: clamp01(action.y1 + dy),
    x2: clamp01(action.x2 + dx),
    y2: clamp01(action.y2 + dy),
  };

  if (action.midX != null) patch.midX = clamp01(action.midX + dx);
  if (action.midY != null) patch.midY = clamp01(action.midY + dy);
  if (action.c1x != null) patch.c1x = clamp01(action.c1x + dx);
  if (action.c1y != null) patch.c1y = clamp01(action.c1y + dy);
  if (action.c2x != null) patch.c2x = clamp01(action.c2x + dx);
  if (action.c2y != null) patch.c2y = clamp01(action.c2y + dy);

  if (action.points?.length) {
    patch.points = action.points.map((value, index) =>
      clamp01(value + (index % 2 === 0 ? dx : dy)),
    );
  }

  return patch;
}

export function stageDeltaToCourtNorm(
  court: CourtRect,
  courtType: CourtType,
  stageDx: number,
  stageDy: number,
  coords: CourtCoordSpace = "raster",
) {
  const playable = getPlayableCourtRect(court, courtType, coords);
  return {
    dx: stageDx / playable.width,
    dy: stageDy / playable.height,
  };
}

function quadBezierPoint(
  sx: number,
  sy: number,
  mx: number,
  my: number,
  ex: number,
  ey: number,
  t: number,
) {
  const u = 1 - t;
  return {
    x: u * u * sx + 2 * u * t * mx + t * t * ex,
    y: u * u * sy + 2 * u * t * my + t * t * ey,
  };
}

function quadBezierTangent(
  sx: number,
  sy: number,
  mx: number,
  my: number,
  ex: number,
  ey: number,
  t: number,
) {
  return {
    x: 2 * (1 - t) * (mx - sx) + 2 * t * (ex - mx),
    y: 2 * (1 - t) * (my - sy) + 2 * t * (ey - my),
  };
}

export function buildDribblePoints(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  midX: number,
  midY: number,
  waveScale = 1,
) {
  const amplitude = DRIBBLE_WAVE_AMPLITUDE * waveScale;
  const wavelength = Math.max(2, DRIBBLE_WAVE_LENGTH * waveScale);
  const halfWave = wavelength / 2;
  const spineSteps = Math.max(40, Math.ceil(Math.hypot(ex - sx, ey - sy) / 2));
  const spine: Array<{ x: number; y: number; t: number; len: number }> = [];
  let totalLen = 0;
  let prev: { x: number; y: number } | null = null;

  for (let i = 0; i <= spineSteps; i++) {
    const t = i / spineSteps;
    const p = quadBezierPoint(sx, sy, midX, midY, ex, ey, t);
    if (prev) totalLen += Math.hypot(p.x - prev.x, p.y - prev.y);
    spine.push({ x: p.x, y: p.y, t, len: totalLen });
    prev = p;
  }
  if (totalLen < 1) return [sx, sy, ex, ey];

  const fadeLen = Math.max(6 * waveScale, totalLen * 0.22);
  const peakCount = Math.max(2, Math.round(totalLen / halfWave));
  const out: number[] = [sx, sy];

  for (let i = 1; i < peakCount; i++) {
    const targetLen = (i / peakCount) * totalLen;
    let idx = 0;
    while (idx < spine.length - 1 && spine[idx + 1].len < targetLen) idx++;
    const a = spine[idx];
    const b = spine[Math.min(idx + 1, spine.length - 1)];
    const segLen = b.len - a.len || 1;
    const u = idx >= spine.length - 1 ? 0 : (targetLen - a.len) / segLen;
    const x = a.x + (b.x - a.x) * u;
    const y = a.y + (b.y - a.y) * u;
    const tSample = a.t + (b.t - a.t) * u;
    const tan = quadBezierTangent(sx, sy, midX, midY, ex, ey, tSample);
    const tlen = Math.hypot(tan.x, tan.y) || 1;
    const pnx = -tan.y / tlen;
    const pny = tan.x / tlen;
    const side = i % 2 === 0 ? 1 : -1;
    const distToEnd = totalLen - targetLen;
    const edgeFade = Math.min(1, targetLen / fadeLen, distToEnd / fadeLen);
    const wave = amplitude * side * edgeFade;
    out.push(x + pnx * wave, y + pny * wave);
  }

  const endTan = quadBezierTangent(sx, sy, midX, midY, ex, ey, 1);
  const tanLen = Math.hypot(endTan.x, endTan.y) || 1;
  const tailLen = Math.min(
    Math.max(DRIBBLE_WAVE_LENGTH * 0.85 * waveScale, 10 * waveScale),
    totalLen * 0.35,
  );
  out.push(
    ex - (endTan.x / tanLen) * tailLen,
    ey - (endTan.y / tanLen) * tailLen,
    ex,
    ey,
  );
  return out;
}

const HANDOFF_POST_ARROW_GAP_BASE = 12;
const HANDOFF_SYMBOL_CROSS_HALF = 8;
const HANDOFF_SYMBOL_BAR_HALF = 9;
const HANDOFF_SYMBOL_STEP = 4;

type HandoffRenderOptions = { compact?: boolean; compactScale?: number };

function resolveHandoffSymbolScale(
  court: CourtRect,
  courtType: CourtType,
  options: HandoffRenderOptions = {},
) {
  if (options.compact) {
    return options.compactScale ?? getThumbnailVisualScale(court.width, courtType);
  }
  return getDesignerActionStrokeScale(court, courtType);
}

export function getHandoffPostArrowGap(
  court: CourtRect,
  courtType: CourtType,
  options: HandoffRenderOptions = {},
) {
  const scale = resolveHandoffSymbolScale(court, courtType, options);
  const minGap = options.compact ? 3 : 8;
  return Math.max(minGap, HANDOFF_POST_ARROW_GAP_BASE * scale);
}

function dribbleEndTangentUnitStage(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  midX: number,
  midY: number,
) {
  const tan = quadBezierTangent(sx, sy, midX, midY, ex, ey, 1);
  const len = Math.hypot(tan.x, tan.y) || 1;
  return { tx: tan.x / len, ty: tan.y / len };
}

export function handoffSymbolStageLines(
  action: Pick<DesignerAction, "x1" | "y1" | "x2" | "y2" | "midX" | "midY">,
  court: CourtRect,
  courtType: CourtType,
  options: HandoffRenderOptions = {},
  coords: CourtCoordSpace = "raster",
): number[][] {
  const { sx, sy, ex, ey } = normEndpointsToStage(action, court, courtType, coords);
  let midX = (sx + ex) / 2;
  let midY = (sy + ey) / 2;
  if (action.midX != null && action.midY != null) {
    const mid = courtNormToStage(court, courtType, action.midX, action.midY, coords);
    const sym = symmetrizeDribbleMid(sx, sy, ex, ey, mid.x, mid.y);
    midX = sym.mx;
    midY = sym.my;
  }

  const scale = resolveHandoffSymbolScale(court, courtType, options);
  const crossHalf = HANDOFF_SYMBOL_CROSS_HALF * scale;
  const barHalf = HANDOFF_SYMBOL_BAR_HALF * scale;
  const step = HANDOFF_SYMBOL_STEP * scale;

  const { tx, ty } = dribbleEndTangentUnitStage(sx, sy, ex, ey, midX, midY);
  const nx = -ty;
  const ny = tx;
  const gap = getHandoffPostArrowGap(court, courtType, options);
  const ox = ex + tx * gap;
  const oy = ey + ty * gap;

  const pLeftBar = step;
  const pCross = pLeftBar + step;
  const pRightBar = pCross + crossHalf * 2;

  const lbx = ox + tx * pLeftBar;
  const lby = oy + ty * pLeftBar;
  const c0x = ox + tx * pCross;
  const c0y = oy + ty * pCross;
  const c1x = ox + tx * pRightBar;
  const c1y = oy + ty * pRightBar;
  const rbx = ox + tx * pRightBar;
  const rby = oy + ty * pRightBar;

  return [
    [
      lbx - nx * barHalf,
      lby - ny * barHalf,
      lbx + nx * barHalf,
      lby + ny * barHalf,
    ],
    [
      c0x - tx * crossHalf,
      c0y - ty * crossHalf,
      c1x + tx * crossHalf,
      c1y + ty * crossHalf,
    ],
    [
      rbx - nx * barHalf,
      rby - ny * barHalf,
      rbx + nx * barHalf,
      rby + ny * barHalf,
    ],
  ];
}

export function buildCurvePoints8(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  actionType: ActionType,
) {
  const { c1x, c1y, c2x, c2y } = buildSymmetricCurveControls(
    sx,
    sy,
    ex,
    ey,
    0,
    actionType === "screen" ? "cut" : actionType,
  );
  return [sx, sy, c1x, c1y, c2x, c2y, ex, ey];
}

function clampPointToRect(
  x: number,
  y: number,
  rect: CourtRect,
) {
  return {
    x: Math.min(rect.x + rect.width, Math.max(rect.x, x)),
    y: Math.min(rect.y + rect.height, Math.max(rect.y, y)),
  };
}

function screenBarHalfLength(court?: CourtRect, courtType: CourtType = "half") {
  if (!court) return 12;
  const ref =
    courtType === "full"
      ? COURT_ELEMENT_REF_WIDTH_FULL
      : COURT_ELEMENT_REF_WIDTH_HALF;
  const scale = court.width / ref;
  return Math.max(4, Math.min(14, 26 * scale * 0.42));
}

function polylineMidpointFlatIndex(points: number[]) {
  const midFlatIdx = Math.floor((points.length - 2) / 2);
  return midFlatIdx % 2 === 0 ? midFlatIdx : midFlatIdx - 1;
}

/** Unit tangent at the screening spot (walk back if the last segment is degenerate). */
function polylineEndTangentUnit(points: number[]) {
  const n = points.length;
  const ex = points[n - 2];
  const ey = points[n - 1];

  for (let i = n - 4; i >= 0; i -= 2) {
    const dx = ex - points[i];
    const dy = ey - points[i + 1];
    const len = Math.hypot(dx, dy);
    if (len >= 1e-3) {
      return { tx: dx / len, ty: dy / len };
    }
  }

  const dx = ex - points[0];
  const dy = ey - points[1];
  const chordLen = Math.hypot(dx, dy);
  if (chordLen < 1e-6) return { tx: 1, ty: 0 };
  return { tx: dx / chordLen, ty: dy / chordLen };
}

function chordPerpendicularUnitFromPoints(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
) {
  const dx = ex - sx;
  const dy = ey - sy;
  const chordLen = Math.hypot(dx, dy);
  if (chordLen < 1e-6) return { nx: 0, ny: 1 };
  return { nx: -dy / chordLen, ny: dx / chordLen };
}

/** Screen end bar perpendicular to the stem at the screening spot. */
export function screenBarPointsFromPolyline(
  points: number[],
  court?: CourtRect,
  courtType: CourtType = "half",
  half?: number,
) {
  if (points.length < 4) return [0, 0, 0, 0];
  const barHalf = half ?? screenBarHalfLength(court, courtType);

  const sx = points[0];
  const sy = points[1];
  const ex = points[points.length - 2];
  const ey = points[points.length - 1];

  const { tx, ty } = polylineEndTangentUnit(points);
  let nx = -ty;
  let ny = tx;

  if (points.length > 4) {
    const mi = polylineMidpointFlatIndex(points);
    const mx = points[mi];
    const my = points[mi + 1];
    const cross = tx * (my - ey) - ty * (mx - ex);
    if (Math.abs(cross) > 1e-3) {
      if (cross < 0) {
        nx = -nx;
        ny = -ny;
      }
    } else {
      const chord = chordPerpendicularUnitFromPoints(sx, sy, ex, ey);
      nx = chord.nx;
      ny = chord.ny;
    }
  } else {
    const chord = chordPerpendicularUnitFromPoints(sx, sy, ex, ey);
    nx = chord.nx;
    ny = chord.ny;
  }

  let bx1 = ex - nx * barHalf;
  let by1 = ey - ny * barHalf;
  let bx2 = ex + nx * barHalf;
  let by2 = ey + ny * barHalf;

  if (court) {
    const c1 = clampPointToRect(bx1, by1, court);
    const c2 = clampPointToRect(bx2, by2, court);
    bx1 = c1.x;
    by1 = c1.y;
    bx2 = c2.x;
    by2 = c2.y;
  }

  return [bx1, by1, bx2, by2];
}

function normEndpointsToStage(
  action: Pick<DesignerAction, "x1" | "y1" | "x2" | "y2">,
  court: CourtRect,
  courtType: CourtType,
  coords: CourtCoordSpace = "raster",
) {
  const start = courtNormToStage(court, courtType, action.x1, action.y1, coords);
  const end = courtNormToStage(court, courtType, action.x2, action.y2, coords);
  return { sx: start.x, sy: start.y, ex: end.x, ey: end.y };
}

function normPolylineToStage(
  polyline: number[],
  court: CourtRect,
  courtType: CourtType,
  coords: CourtCoordSpace = "raster",
) {
  const out: number[] = [];
  for (let i = 0; i < polyline.length; i += 2) {
    const p = courtNormToStage(court, courtType, polyline[i], polyline[i + 1], coords);
    out.push(p.x, p.y);
  }
  return out;
}

/** Scale dribble zig-zag to court size (constants are tuned for ref court width). */
export function getDribbleWaveScale(court: CourtRect, courtType: CourtType) {
  const ref =
    courtType === "full"
      ? COURT_ELEMENT_REF_WIDTH_FULL
      : COURT_ELEMENT_REF_WIDTH_HALF;
  if (court.width <= 0 || ref <= 0) return 1;
  return Math.max(0.12, court.width / ref);
}

function getReferenceCourtRect(courtType: CourtType): CourtRect {
  const width =
    courtType === "full"
      ? COURT_ELEMENT_REF_WIDTH_FULL
      : COURT_ELEMENT_REF_WIDTH_HALF;
  const height =
    courtType === "full" ? Math.round(width * 0.52) : Math.round(width * 0.92);
  return getPlayableCourtRect(
    { x: 0, y: 0, width, height },
    courtType,
    "raster",
  );
}

/** FastDraw-style dribble polyline in stage pixels (zig-zag along curved spine). */
export function buildDribbleStagePoints(
  action: DesignerAction | ActionDraft,
  court: CourtRect,
  courtType: CourtType,
  coords: CourtCoordSpace = "raster",
): number[] {
  const { sx, sy, ex, ey } = normEndpointsToStage(action, court, courtType, coords);
  let midX = (sx + ex) / 2;
  let midY = (sy + ey) / 2;
  if (action.midX != null && action.midY != null) {
    const mid = courtNormToStage(court, courtType, action.midX, action.midY, coords);
    const sym = symmetrizeDribbleMid(sx, sy, ex, ey, mid.x, mid.y);
    midX = sym.mx;
    midY = sym.my;
  }
  return buildDribblePoints(
    sx,
    sy,
    ex,
    ey,
    midX,
    midY,
    getDribbleWaveScale(court, courtType),
  );
}

function stagePolylineToNorm(
  stagePoints: number[],
  court: CourtRect,
  courtType: CourtType,
  coords: CourtCoordSpace = "raster",
) {
  const out: number[] = [];
  for (let i = 0; i < stagePoints.length; i += 2) {
    const norm = stageToCourtNorm(
      court,
      courtType,
      stagePoints[i]!,
      stagePoints[i + 1]!,
      coords,
    );
    out.push(norm.x, norm.y);
  }
  return out;
}

export function actionToNormPoints(
  action: DesignerAction | ActionDraft,
  courtType: CourtType = "half",
): number[] {
  const sx = action.x1;
  const sy = action.y1;
  const ex = action.x2;
  const ey = action.y2;

  switch (action.type) {
    case "pass":
    case "shoot":
      return [sx, sy, ex, ey];
    case "dribble":
    case "handoff": {
      const refCourt = getReferenceCourtRect(courtType);
      return stagePolylineToNorm(
        buildDribbleStagePoints(action, refCourt, courtType),
        refCourt,
        courtType,
      );
    }
    case "cut":
    case "curl":
    case "screen":
      return buildActionCurveRenderPoints(action);
    default: {
      const polyline = "points" in action ? action.points : undefined;
      if (polyline?.length && polyline.length >= 4) return [...polyline];
      return [sx, sy, ex, ey];
    }
  }
}

/** Point at arc-length progress 0–1 along a normalized polyline. */
export function pointAlongNormPolyline(
  points: number[],
  progress: number,
): { x: number; y: number } {
  if (points.length < 2) return { x: 0, y: 0 };
  if (progress <= 0) return { x: points[0]!, y: points[1]! };
  if (progress >= 1) {
    return {
      x: points[points.length - 2]!,
      y: points[points.length - 1]!,
    };
  }

  let total = 0;
  const segments: Array<{ len: number; i: number }> = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const len = Math.hypot(
      points[i + 2]! - points[i]!,
      points[i + 3]! - points[i + 1]!,
    );
    segments.push({ len, i });
    total += len;
  }
  if (total <= 0) return { x: points[0]!, y: points[1]! };

  const target = total * progress;
  let acc = 0;
  for (const seg of segments) {
    if (acc + seg.len >= target) {
      const local = (target - acc) / seg.len;
      const x1 = points[seg.i]!;
      const y1 = points[seg.i + 1]!;
      const x2 = points[seg.i + 2]!;
      const y2 = points[seg.i + 3]!;
      return { x: x1 + (x2 - x1) * local, y: y1 + (y2 - y1) * local };
    }
    acc += seg.len;
  }
  return {
    x: points[points.length - 2]!,
    y: points[points.length - 1]!,
  };
}

export function actionPathPointAt(
  action: DesignerAction | ActionDraft,
  progress: number,
  courtType: CourtType = "half",
): { x: number; y: number } {
  return pointAlongNormPolyline(actionToNormPoints(action, courtType), progress);
}

/** Control handle position on the rendered path (normalized coords). */
export function actionHandlePointOnPath(
  action: DesignerAction,
  courtType: CourtType = "half",
): { x: number; y: number } {
  if (usesSymmetricCurveControls(action.type) || action.type === "dribble" || action.type === "handoff") {
    return actionCurvePeakNorm(action);
  }
  return actionPathPointAt(action, 0.5, courtType);
}

export function actionToStagePoints(
  action: DesignerAction | ActionDraft,
  court: CourtRect,
  courtType: CourtType,
  coords: CourtCoordSpace = "raster",
): number[] {
  switch (action.type) {
    case "pass":
    case "shoot":
      return normPolylineToStage(
        actionToNormPoints(action, courtType),
        court,
        courtType,
        coords,
      );
    case "dribble":
    case "handoff":
      return buildDribbleStagePoints(action, court, courtType, coords);
    case "cut":
    case "curl":
    case "screen":
      return normPolylineToStage(
        actionToNormPoints(action, courtType),
        court,
        courtType,
        coords,
      );
    default: {
      const polyline = "points" in action ? action.points : undefined;
      if (polyline?.length && polyline.length >= 4) {
        return normPolylineToStage(polyline, court, courtType, coords);
      }
      const { sx, sy, ex, ey } = normEndpointsToStage(
        action,
        court,
        courtType,
        coords,
      );
      return [sx, sy, ex, ey];
    }
  }
}

/** Legacy FastCourt / FastDraw thumbnail stroke scale. */
export const COURT_ELEMENT_REF_WIDTH_HALF = 680;
export const COURT_ELEMENT_REF_WIDTH_FULL = 960;

/** Proportional scale vs FastDraw reference court width (editor = 1). */
export function getFastDrawCourtElementScale(
  courtWidth: number,
  courtType: CourtType,
) {
  const ref =
    courtType === "full"
      ? COURT_ELEMENT_REF_WIDTH_FULL
      : COURT_ELEMENT_REF_WIDTH_HALF;
  return courtWidth > 0 ? courtWidth / ref : 1;
}

/** Frame strip thumbnails — same proportion as main canvas elements. */
export function getDesignerStripThumbnailScale(
  courtWidth: number,
  courtType: CourtType = "half",
) {
  return Math.max(0.16, Math.min(1, getFastDrawCourtElementScale(courtWidth, courtType)));
}

export function getThumbnailVisualScale(
  courtWidth: number,
  courtType: CourtType = "half",
) {
  return Math.max(0.28, Math.min(1, getFastDrawCourtElementScale(courtWidth, courtType)));
}

/** Designer frame-strip player numbers (proportional, no library min clamp). */
export function getDesignerStripPlayerFontSize(
  courtWidth: number,
  courtType: CourtType,
  kind: "offense" | "defense" = "offense",
) {
  const base = kind === "defense" ? 24 : 26;
  const scale = getFastDrawCourtElementScale(courtWidth, courtType);
  return Math.max(7, Math.round(base * scale));
}

/** Main designer canvas — jersey numbers (50% larger than prior editor sizing). */
export function getEditorPlayerJerseyFontSize(
  radius: number,
  kind: "offense" | "defense",
) {
  const base = kind === "defense" ? 24 : 26;
  const radiusScale = Math.max(0.85, radius / 24);
  return Math.round(base * radiusScale * 1.72);
}

/** Library / print / presentation player numbers (legacy FastCourt bases). */
export function getThumbnailPlayerFontSize(
  courtWidth: number,
  courtType: CourtType,
  kind: "offense" | "defense" = "offense",
) {
  const ref =
    courtType === "full"
      ? COURT_ELEMENT_REF_WIDTH_FULL
      : COURT_ELEMENT_REF_WIDTH_HALF;
  const base = kind === "defense" ? 24 : 26;
  const scale = Math.max(0.75, Math.min(1.35, courtWidth / ref));
  return Math.max(20, Math.round(base * scale));
}

/** Designer canvas stroke scale (thinner on smaller courts). */
export function getDesignerActionStrokeScale(
  court: CourtRect,
  courtType: CourtType,
) {
  const ref =
    courtType === "full"
      ? COURT_ELEMENT_REF_WIDTH_FULL
      : COURT_ELEMENT_REF_WIDTH_HALF;
  const scale = court.width > 0 ? court.width / ref : 1;
  return Math.max(0.55, Math.min(1, scale));
}

export function resolveActionStrokeWidth(
  baseStroke: number | undefined,
  court: CourtRect,
  courtType: CourtType,
  options: { compact?: boolean; compactScale?: number } = {},
) {
  const base = baseStroke ?? DEFAULT_ARROW_STROKE;
  const scale = options.compact
    ? (options.compactScale ??
        getThumbnailVisualScale(court.width, courtType))
    : getDesignerActionStrokeScale(court, courtType);
  const scaled = base * scale;
  if (options.compact) {
    return Math.max(0.55, scaled);
  }
  return Math.max(1, scaled);
}

export function resolveActionPointerSize(
  court: CourtRect,
  courtType: CourtType,
  options: { compact?: boolean; compactScale?: number } = {},
) {
  const scale = options.compact
    ? (options.compactScale ??
        getThumbnailVisualScale(court.width, courtType))
    : getDesignerActionStrokeScale(court, courtType);
  if (options.compact) {
    return Math.max(2, Math.round(6 * scale));
  }
  return Math.max(4, Math.round(9 * scale));
}

export function getActionColor(type: ActionType) {
  if (typeof window !== "undefined") {
    const colors = getRuntimeActionColors();
    if (colors?.[type]) return colors[type];
  }
  return ACTION_COLORS[type] ?? "#000000";
}

export function resolveActionColor(
  action: Pick<DesignerAction, "type" | "color">,
) {
  if (action.color) return action.color;
  return getActionColor(action.type);
}

let runtimeActionColors: Partial<Record<ActionType, string>> | null = null;

export function setRuntimeActionColors(
  colors: Partial<Record<ActionType, string>> | null,
) {
  runtimeActionColors = colors;
}

function getRuntimeActionColors() {
  return runtimeActionColors;
}
