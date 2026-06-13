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
  const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = controls;
  const chordLen = Math.hypot(ex - sx, ey - sy);
  const curveType = curveTypeForAction(actionType);
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
    const bulge = pointBulgeFromChord(action.midX, action.midY, sx, sy, ex, ey);
    const { c1x, c1y, c2x, c2y } = buildSymmetricCurveControls(
      sx,
      sy,
      ex,
      ey,
      bulge,
      curveType,
    );
    return symmetrizeControlPoints8(
      [sx, sy, c1x, c1y, c2x, c2y, ex, ey],
      action.type,
    );
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
  let [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = controls;
  const curveType = curveTypeForAction(action.type);

  if (kind === "start") {
    if (action.type === "dribble" || action.type === "handoff") {
      return { x1: nx, y1: ny };
    }
    if (usesSymmetricCurveControls(action.type)) {
      return controls8ToActionPatch([nx, ny, c1x, c1y, c2x, c2y, ex, ey]);
    }
    return { x1: nx, y1: ny };
  }

  if (kind === "end") {
    if (action.type === "dribble" || action.type === "handoff") {
      return { x2: nx, y2: ny };
    }
    if (usesSymmetricCurveControls(action.type)) {
      return controls8ToActionPatch([sx, sy, c1x, c1y, c2x, c2y, nx, ny]);
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

  if (kind === "peak") {
    const bulge = pointBulgeFromChord(nx, ny, sx, sy, ex, ey);
    const sym = buildSymmetricCurveControls(sx, sy, ex, ey, bulge, curveType);
    return controls8ToActionPatch([sx, sy, sym.c1x, sym.c1y, sym.c2x, sym.c2y, ex, ey]);
  }

  const mid = symmetrizeDribbleMid(sx, sy, ex, ey, nx, ny);
  return { midX: mid.mx, midY: mid.my };
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
) {
  const playable = getPlayableCourtRect(court, courtType);
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

  const out: number[] = [];
  const count = Math.max(16, Math.ceil(totalLen / 2));
  for (let i = 0; i < count; i++) {
    const targetLen = (i / count) * totalLen;
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

    let wave = 0;
    if (i > 0 && i < count - 1) {
      const phase = (targetLen / wavelength) * Math.PI * 2;
      const waveRaw = Math.sin(phase);
      const softened = Math.sign(waveRaw) * Math.pow(Math.abs(waveRaw), 0.72);
      const fadeLen = Math.max(6 * waveScale, totalLen * 0.22);
      const distToEnd = totalLen - targetLen;
      const edgeFade = Math.min(1, targetLen / fadeLen, distToEnd / fadeLen);
      wave = amplitude * softened * edgeFade;
    }
    out.push(x + pnx * wave, y + pny * wave);
  }

  out[0] = sx;
  out[1] = sy;
  const endTan = quadBezierTangent(sx, sy, midX, midY, ex, ey, 1);
  const tanLen = Math.hypot(endTan.x, endTan.y) || 1;
  const tailLen = Math.min(
    Math.max(DRIBBLE_WAVE_LENGTH * 0.85 * waveScale, 10 * waveScale),
    totalLen * 0.35,
  );
  out.push(ex - (endTan.x / tanLen) * tailLen, ey - (endTan.y / tanLen) * tailLen);
  out.push(ex, ey);
  return out;
}

const HANDOFF_SYMBOL_GAP = 4;
const HANDOFF_SYMBOL_DASH = 3;
const HANDOFF_SYMBOL_CROSS_HALF = 8;
const HANDOFF_SYMBOL_BAR_HALF = 9;
const HANDOFF_SYMBOL_STEP = 4;

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
): number[][] {
  const { sx, sy, ex, ey } = normEndpointsToStage(action, court, courtType);
  let midX = (sx + ex) / 2;
  let midY = (sy + ey) / 2;
  if (action.midX != null && action.midY != null) {
    const mid = courtNormToStage(court, courtType, action.midX, action.midY);
    const sym = symmetrizeDribbleMid(sx, sy, ex, ey, mid.x, mid.y);
    midX = sym.mx;
    midY = sym.my;
  }

  const { tx, ty } = dribbleEndTangentUnitStage(sx, sy, ex, ey, midX, midY);
  const nx = -ty;
  const ny = tx;
  const ox = ex + tx * HANDOFF_SYMBOL_GAP;
  const oy = ey + ty * HANDOFF_SYMBOL_GAP;

  const pLeftBar = HANDOFF_SYMBOL_DASH + HANDOFF_SYMBOL_STEP;
  const pCross = pLeftBar + HANDOFF_SYMBOL_STEP;
  const pRightBar = pCross + HANDOFF_SYMBOL_CROSS_HALF * 2;
  const pRightDash = pRightBar + HANDOFF_SYMBOL_STEP;

  const lbx = ox + tx * pLeftBar;
  const lby = oy + ty * pLeftBar;
  const c0x = ox + tx * pCross;
  const c0y = oy + ty * pCross;
  const c1x = ox + tx * pRightBar;
  const c1y = oy + ty * pRightBar;
  const rbx = ox + tx * pRightBar;
  const rby = oy + ty * pRightBar;

  return [
    [ox, oy, ox + tx * HANDOFF_SYMBOL_DASH, oy + ty * HANDOFF_SYMBOL_DASH],
    [
      lbx - nx * HANDOFF_SYMBOL_BAR_HALF,
      lby - ny * HANDOFF_SYMBOL_BAR_HALF,
      lbx + nx * HANDOFF_SYMBOL_BAR_HALF,
      lby + ny * HANDOFF_SYMBOL_BAR_HALF,
    ],
    [
      c0x - tx * HANDOFF_SYMBOL_CROSS_HALF,
      c0y - ty * HANDOFF_SYMBOL_CROSS_HALF,
      c1x + tx * HANDOFF_SYMBOL_CROSS_HALF,
      c1y + ty * HANDOFF_SYMBOL_CROSS_HALF,
    ],
    [
      rbx - nx * HANDOFF_SYMBOL_BAR_HALF,
      rby - ny * HANDOFF_SYMBOL_BAR_HALF,
      rbx + nx * HANDOFF_SYMBOL_BAR_HALF,
      rby + ny * HANDOFF_SYMBOL_BAR_HALF,
    ],
    [
      ox + tx * pRightDash,
      oy + ty * pRightDash,
      ox + tx * (pRightDash + HANDOFF_SYMBOL_DASH),
      oy + ty * (pRightDash + HANDOFF_SYMBOL_DASH),
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

function polylineArcLength(points: number[]) {
  let total = 0;
  for (let i = 2; i < points.length; i += 2) {
    total += Math.hypot(
      points[i] - points[i - 2],
      points[i + 1] - points[i - 1],
    );
  }
  return total;
}

/** Tangent at polyline end using arc-length sampling (legacy getPointAtLength style). */
function polylineEndTangentUnit(points: number[]) {
  if (points.length < 4) return { tx: 1, ty: 0 };

  const ex = points[points.length - 2];
  const ey = points[points.length - 1];
  const total = polylineArcLength(points);
  const delta = Math.min(14, Math.max(4, total * 0.08));

  let remaining = delta;
  let px = points[points.length - 4];
  let py = points[points.length - 3];

  for (let i = points.length - 4; i >= 0; i -= 2) {
    const qx = points[i];
    const qy = points[i + 1];
    const segLen = Math.hypot(px - qx, py - qy);
    if (segLen <= remaining) {
      remaining -= segLen;
      px = qx;
      py = qy;
      continue;
    }
    const t = (segLen - remaining) / segLen;
    px = qx + (px - qx) * t;
    py = qy + (py - qy) * t;
    remaining = 0;
    break;
  }

  const dx = ex - px;
  const dy = ey - py;
  const len = Math.hypot(dx, dy);
  if (len > 1e-6) return { tx: dx / len, ty: dy / len };

  const chord = chordPerpendicularUnit(points[0], points[1], ex, ey);
  return { tx: chord.dx / (Math.hypot(chord.dx, chord.dy) || 1), ty: chord.dy / (Math.hypot(chord.dx, chord.dy) || 1) };
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

function screenBarHalfLength(court?: CourtRect) {
  if (!court) return 12;
  return Math.max(8, Math.min(18, court.width * 0.02));
}

/** Screen end bar perpendicular to curve tangent; clipped to court bounds. */
export function screenBarPointsFromPolyline(
  points: number[],
  court?: CourtRect,
  half = screenBarHalfLength(court),
) {
  if (points.length < 4) return [0, 0, 0, 0];

  const ex = points[points.length - 2];
  const ey = points[points.length - 1];
  const { tx, ty } = polylineEndTangentUnit(points);
  const nx = -ty;
  const ny = tx;

  let bx1 = ex - nx * half;
  let by1 = ey - ny * half;
  let bx2 = ex + nx * half;
  let by2 = ey + ny * half;

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
) {
  const start = courtNormToStage(court, courtType, action.x1, action.y1);
  const end = courtNormToStage(court, courtType, action.x2, action.y2);
  return { sx: start.x, sy: start.y, ex: end.x, ey: end.y };
}

function normPolylineToStage(
  polyline: number[],
  court: CourtRect,
  courtType: CourtType,
) {
  const out: number[] = [];
  for (let i = 0; i < polyline.length; i += 2) {
    const p = courtNormToStage(court, courtType, polyline[i], polyline[i + 1]);
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
  return Math.max(0.18, court.width / ref);
}

export function actionToStagePoints(
  action: DesignerAction | ActionDraft,
  court: CourtRect,
  courtType: CourtType,
): number[] {
  const { sx, sy, ex, ey } = normEndpointsToStage(action, court, courtType);

  switch (action.type) {
    case "pass":
    case "shoot":
      return [sx, sy, ex, ey];
    case "dribble":
    case "handoff": {
      let midX = (sx + ex) / 2;
      let midY = (sy + ey) / 2;
      if (action.midX != null && action.midY != null) {
        const mid = courtNormToStage(court, courtType, action.midX, action.midY);
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
    case "cut":
    case "curl":
    case "screen": {
      const controls = resolveActionControls8(action);
      const normControls = controls;
      const { renderPts } = buildSampledCurveRender(normControls, action.type);
      const stagePts: number[] = [];
      for (let i = 0; i < renderPts.length; i += 2) {
        const p = courtNormToStage(court, courtType, renderPts[i], renderPts[i + 1]);
        stagePts.push(p.x, p.y);
      }
      return stagePts;
    }
    default: {
      const polyline = "points" in action ? action.points : undefined;
      if (polyline?.length && polyline.length >= 4) {
        return normPolylineToStage(polyline, court, courtType);
      }
      return [sx, sy, ex, ey];
    }
  }
}

/** Legacy FastCourt / FastDraw thumbnail stroke scale. */
export const COURT_ELEMENT_REF_WIDTH_HALF = 680;
export const COURT_ELEMENT_REF_WIDTH_FULL = 960;

/** Frame strip / small Konva previews (not main canvas). */
export function getDesignerStripThumbnailScale(courtWidth: number) {
  return Math.max(0.2, Math.min(0.32, courtWidth / 780));
}

export function getThumbnailVisualScale(courtWidth: number) {
  return Math.max(0.38, Math.min(0.52, courtWidth / 620));
}

/** Main designer canvas — jersey numbers (50% larger than prior editor sizing). */
export function getEditorPlayerJerseyFontSize(
  radius: number,
  kind: "offense" | "defense",
) {
  const base = kind === "defense" ? 24 : 26;
  const radiusScale = Math.max(0.85, radius / 24);
  return Math.round(base * radiusScale * 1.5);
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
    ? (options.compactScale ?? getThumbnailVisualScale(court.width))
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
    ? (options.compactScale ?? getThumbnailVisualScale(court.width))
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

let runtimeActionColors: Partial<Record<ActionType, string>> | null = null;

export function setRuntimeActionColors(
  colors: Partial<Record<ActionType, string>> | null,
) {
  runtimeActionColors = colors;
}

function getRuntimeActionColors() {
  return runtimeActionColors;
}
