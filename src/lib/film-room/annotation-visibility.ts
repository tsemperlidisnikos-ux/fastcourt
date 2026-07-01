import type { VideoAnnotationStroke } from "@/types/film-room";

/** Seconds a laser mark stays visible after its anchor time. */
export const LASER_HOLD_SEC = 2.5;

export function isStrokeVisibleAt(
  stroke: VideoAnnotationStroke,
  currentTime: number,
): boolean {
  if (currentTime + 0.04 < stroke.time) return false;
  if (stroke.kind === "laser") {
    return currentTime <= stroke.time + LASER_HOLD_SEC;
  }
  return true;
}

export function visibleStrokesAt(
  strokes: VideoAnnotationStroke[],
  currentTime: number,
): VideoAnnotationStroke[] {
  return strokes.filter((stroke) => isStrokeVisibleAt(stroke, currentTime));
}
