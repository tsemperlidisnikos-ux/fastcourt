import type { WhiteboardStroke } from "@/types/designer";

export const WHITEBOARD_ERASER_RADIUS_NORM = 0.02;

export function whiteboardStrokeHitsEraser(
  points: number[],
  x: number,
  y: number,
  radius = WHITEBOARD_ERASER_RADIUS_NORM,
) {
  for (let i = 0; i < points.length; i += 2) {
    if (Math.hypot(points[i] - x, points[i + 1] - y) <= radius) {
      return true;
    }
  }
  return false;
}

export function filterWhiteboardStrokesAt(
  strokes: WhiteboardStroke[],
  x: number,
  y: number,
  radius = WHITEBOARD_ERASER_RADIUS_NORM,
) {
  return strokes.filter(
    (stroke) => !whiteboardStrokeHitsEraser(stroke.points, x, y, radius),
  );
}
