import {
  buildSymmetricCurveControls,
  symmetrizeDribbleMid,
} from "@/lib/designer/action-geometry";
import type { ActionType, CourtRect, DesignerObject } from "@/types/designer";

export function polylineLengthNorm(flat: number[]) {
  let len = 0;
  for (let i = 2; i < flat.length; i += 2) {
    len += Math.hypot(flat[i] - flat[i - 2], flat[i + 1] - flat[i - 1]);
  }
  return len;
}

export function prepareFreehandPath(
  flat: number[],
  objects: DesignerObject[],
  court: CourtRect,
) {
  void objects;
  void court;
  return flat.slice();
}

export function freehandEndpoints(flat: number[]) {
  return {
    x1: flat[0],
    y1: flat[1],
    x2: flat[flat.length - 2],
    y2: flat[flat.length - 1],
    midX: flat[Math.floor(flat.length / 4) * 2] ?? (flat[0] + flat[flat.length - 2]) / 2,
    midY: flat[Math.floor(flat.length / 4) * 2 + 1] ?? (flat[1] + flat[flat.length - 1]) / 2,
  };
}

function polylinePointAtArcLength(flat: number[], targetLen: number) {
  const sx = flat[0];
  const sy = flat[1];
  if (flat.length < 4 || targetLen <= 0) return { x: sx, y: sy };

  let acc = 0;
  for (let i = 2; i < flat.length; i += 2) {
    const x1 = flat[i - 2];
    const y1 = flat[i - 1];
    const x2 = flat[i];
    const y2 = flat[i + 1];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    if (acc + segLen >= targetLen) {
      const u = segLen > 0 ? (targetLen - acc) / segLen : 0;
      return { x: x1 + u * (x2 - x1), y: y1 + u * (y2 - y1) };
    }
    acc += segLen;
  }

  return {
    x: flat[flat.length - 2],
    y: flat[flat.length - 1],
  };
}

/** Fit dribble/hand-off spine mid from a curved freehand stroke. */
export function dribbleMidFromFlat(flat: number[]) {
  const sx = flat[0];
  const sy = flat[1];
  const ex = flat[flat.length - 2];
  const ey = flat[flat.length - 1];
  if (flat.length < 6) {
    return { midX: (sx + ex) / 2, midY: (sy + ey) / 2 };
  }

  const totalLen = polylineLengthNorm(flat);
  const half = polylinePointAtArcLength(flat, totalLen / 2);
  // Quadratic spine: B(0.5) = 0.25*S + 0.5*M + 0.25*E  =>  M = 2*B(0.5) - 0.5*(S+E)
  const mx = 2 * half.x - 0.5 * (sx + ex);
  const my = 2 * half.y - 0.5 * (sy + ey);
  const sym = symmetrizeDribbleMid(sx, sy, ex, ey, mx, my);
  return { midX: sym.mx, midY: sym.my };
}

export function adjustFreehandEndpoints(
  flat: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  if (flat.length < 4) return flat;
  const out = flat.slice();
  out[0] = x1;
  out[1] = y1;
  out[out.length - 2] = x2;
  out[out.length - 1] = y2;
  return out;
}

export function isFreehandStroke(flat: number[]) {
  return flat.length > 4;
}

export function curveMidFromFlat(flat: number[], actionType: ActionType) {
  const sx = flat[0];
  const sy = flat[1];
  const ex = flat[flat.length - 2];
  const ey = flat[flat.length - 1];
  const chordLen = Math.hypot(ex - sx, ey - sy) || 1;
  let peakBulge = 0;
  let peakX = (sx + ex) / 2;
  let peakY = (sy + ey) / 2;
  for (let i = 2; i < flat.length - 2; i += 2) {
    const px = flat[i];
    const py = flat[i + 1];
    const { nx, ny } = (() => {
      const dx = ex - sx;
      const dy = ey - sy;
      const len = Math.hypot(dx, dy) || 1;
      return { nx: -dy / len, ny: dx / len };
    })();
    const signed = (px - sx) * nx + (py - sy) * ny;
    if (Math.abs(signed) > Math.abs(peakBulge)) {
      peakBulge = signed;
      peakX = px;
      peakY = py;
    }
  }
  const curveType = actionType === "screen" ? "cut" : actionType;
  const bulge = peakBulge * 0.85 || chordLen * 0.06;
  const controls = buildSymmetricCurveControls(sx, sy, ex, ey, bulge, curveType);
  return {
    midX: (controls.c1x + controls.c2x) / 2,
    midY: (controls.c1y + controls.c2y) / 2,
    c1x: controls.c1x,
    c1y: controls.c1y,
    c2x: controls.c2x,
    c2y: controls.c2y,
    fallbackMidX: peakX,
    fallbackMidY: peakY,
  };
}
