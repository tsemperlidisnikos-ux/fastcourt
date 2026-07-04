import type { VideoAnnotationStroke } from "@/types/film-room";

export function isPenStroke(stroke: VideoAnnotationStroke) {
  return stroke.kind !== "laser";
}

export function withoutPenStrokes(strokes: VideoAnnotationStroke[]) {
  return strokes.filter((stroke) => !isPenStroke(stroke));
}

export function withoutPenStrokesNearTime(
  strokes: VideoAnnotationStroke[],
  time: number,
  epsilon = 0.25,
) {
  return strokes.filter(
    (stroke) => !(isPenStroke(stroke) && Math.abs(stroke.time - time) <= epsilon),
  );
}

export function countPenStrokes(strokes: VideoAnnotationStroke[]) {
  return strokes.filter(isPenStroke).length;
}
