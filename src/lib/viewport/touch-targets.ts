/** Default Konva line hit width (mouse / fine pointer). */
export const KONVA_LINE_HIT = 14;

/** Wider hit area for touch drawing and selection. */
export const KONVA_LINE_HIT_COARSE = 24;

/** Edit-handle dot radius on fine pointer. */
export const KONVA_HANDLE_RADIUS = 7;

/** Edit-handle dot radius on coarse pointer. */
export const KONVA_HANDLE_RADIUS_COARSE = 9;

/** Small curve-control handle radius on fine pointer. */
export const KONVA_SMALL_HANDLE_RADIUS = 5;

/** Small curve-control handle radius on coarse pointer. */
export const KONVA_SMALL_HANDLE_RADIUS_COARSE = 7;

export function konvaLineHitWidth(coarse: boolean): number {
  return coarse ? KONVA_LINE_HIT_COARSE : KONVA_LINE_HIT;
}

export function konvaHandleHitWidth(coarse: boolean): number {
  return coarse ? 32 : 18;
}

export function konvaHandleRadius(coarse: boolean, small = false): number {
  if (small) {
    return coarse ? KONVA_SMALL_HANDLE_RADIUS_COARSE : KONVA_SMALL_HANDLE_RADIUS;
  }
  return coarse ? KONVA_HANDLE_RADIUS_COARSE : KONVA_HANDLE_RADIUS;
}

/** Tap vs drag threshold in normalized court coordinates. */
export function tapMoveThreshold(pointerType?: string): number {
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return 0.04;
  }
  if (pointerType === "touch") return 0.035;
  return 0.025;
}
