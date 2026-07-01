import type { VideoAnnotationStroke } from "@/types/film-room";

export function isPenStroke(stroke: VideoAnnotationStroke) {
  return stroke.kind !== "laser";
}

export function withoutPenStrokes(strokes: VideoAnnotationStroke[]) {
  return strokes.filter((stroke) => !isPenStroke(stroke));
}

export function countPenStrokes(strokes: VideoAnnotationStroke[]) {
  return strokes.filter(isPenStroke).length;
}
