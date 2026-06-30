import type { WhiteboardStroke } from "@/types/designer";
import { eraseStrokesAt } from "@/lib/designer/stroke-partial-eraser";

export const WHITEBOARD_ERASER_RADIUS_NORM = 0.02;

export function whiteboardStrokeEqual(
  a: WhiteboardStroke,
  b: WhiteboardStroke,
) {
  if (a.color !== b.color || a.width !== b.width) return false;
  if (a.points.length !== b.points.length) return false;
  for (let i = 0; i < a.points.length; i++) {
    if (a.points[i] !== b.points[i]) return false;
  }
  return true;
}

export function whiteboardStrokesEqual(
  a: WhiteboardStroke[],
  b: WhiteboardStroke[],
) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!whiteboardStrokeEqual(a[i], b[i])) return false;
  }
  return true;
}

/** Erase only the touched portion of each stroke (partial eraser). */
export function eraseWhiteboardStrokesAt(
  strokes: WhiteboardStroke[],
  x: number,
  y: number,
  radius = WHITEBOARD_ERASER_RADIUS_NORM,
) {
  return eraseStrokesAt(strokes, x, y, radius);
}
