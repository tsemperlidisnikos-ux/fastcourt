export type DefenseMarkerStyle = "mark" | "guard";



export const DEFENSE_MARKER_STYLES: DefenseMarkerStyle[] = ["mark", "guard"];



/** FastDraw guard red — outline and arc stroke. */
export const GUARD_MARKER_COLOR = "#e2231a";

/** Arc interior — stroke-only glyph (photo 1 style). */
export const GUARD_MARKER_FILL = "none";

/** Jersey number inside guard ring. */
export const GUARD_MARKER_LABEL_COLOR = "#111111";



/** Guard glyph — shared by sidebar SVG and court Konva. */

/** Canonical scale reference (court ringRadius maps 1:1 here). */
export const GUARD_CIRCLE_RADIUS = 7.2;

/** Uniform size boost for the whole guard glyph (arc + ring + label). */
export const GUARD_GLYPH_SIZE_SCALE = 1.12;

/** Drawn ring — player number sits inside. */
export const GUARD_RING_RADIUS = 4;
/** Court / Konva marker stroke (bold on the floor). */
export const GUARD_CIRCLE_STROKE = 3.65;

/** Toolbar Positions → Defense icon — thinner lines. */
export const GUARD_MENU_STROKE = 2.05;

/** Scale toolbar glyph to fit inside the 36px button frame. */
export const GUARD_MENU_GLYPH_SCALE = 0.86;

/** Frame sidebar thumbnails — thinner lines than court. */
export const GUARD_FRAME_STROKE_RATIO = 0.58;



/** Top of player circle — arc sits flush here. */
export const GUARD_OUTER_RADIUS =
  GUARD_RING_RADIUS + GUARD_CIRCLE_STROKE / 2;

/** Wide semicircle above the ring (FastDraw / photo 1 style). */
export const GUARD_ARC_HALF_WIDTH = 10;
export const GUARD_ARC_RADIUS = 10;
const GUARD_ARC_BASE_Y = -GUARD_OUTER_RADIUS;

/** Number + ring scale vs court sizing reference. */
export const GUARD_RING_TO_GLYPH_RATIO = GUARD_RING_RADIUS / GUARD_CIRCLE_RADIUS;

/**
 * Semicircular arc over the player ring — Konva-safe M/A only.
 * Opens downward; bottom of arc meets the top of the circle.
 */
export const GUARD_WING_PATH_D = [
  `M -${GUARD_ARC_HALF_WIDTH} ${GUARD_ARC_BASE_Y}`,
  `A ${GUARD_ARC_RADIUS} ${GUARD_ARC_RADIUS} 0 0 0 ${GUARD_ARC_HALF_WIDTH} ${GUARD_ARC_BASE_Y}`,
].join(" ");

/** @deprecated alias — arc peak used for rotation handle distance. */
export const GUARD_WING_TIP_X = GUARD_ARC_HALF_WIDTH;



export function normalizeDefenseMarkerStyle(

  raw: string | undefined,

): DefenseMarkerStyle {

  return raw === "guard" ? "guard" : "mark";

}



export function guardRotationFromStagePoint(

  centerX: number,

  centerY: number,

  pointX: number,

  pointY: number,

) {

  const deg = (Math.atan2(pointX - centerX, centerY - pointY) * 180) / Math.PI;

  return ((deg % 360) + 360) % 360;

}



export function guardHandleStageOffset(circleRadius: number, rotationDeg: number) {
  const rad = (rotationDeg * Math.PI) / 180;
  const dist = guardHitRadius(circleRadius);
  return {
    dx: Math.sin(rad) * dist,
    dy: -Math.cos(rad) * dist,
  };
}

/** Project a stage point onto the dashed rotation guide circle. */
export function snapGuardHandleStagePoint(
  centerX: number,
  centerY: number,
  pointX: number,
  pointY: number,
  circleRadius: number,
) {
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  const len = Math.hypot(dx, dy) || 1;
  const dist = guardHitRadius(circleRadius);
  return {
    x: centerX + (dx / len) * dist,
    y: centerY + (dy / len) * dist,
  };
}



export function guardGlyphScale(circleRadius: number) {

  return (circleRadius / GUARD_CIRCLE_RADIUS) * GUARD_GLYPH_SIZE_SCALE;

}



export function guardHitRadius(circleRadius: number) {
  const peak =
    GUARD_ARC_RADIUS + Math.abs(GUARD_ARC_BASE_Y);
  const reach = Math.max(GUARD_ARC_HALF_WIDTH, peak);
  return (
    circleRadius * (reach / GUARD_CIRCLE_RADIUS) * GUARD_GLYPH_SIZE_SCALE
  );
}



export function guardRingStrokeWidth(circleRadius: number, compact = false) {

  const scale = circleRadius / GUARD_CIRCLE_RADIUS;

  const width = GUARD_CIRCLE_STROKE * scale * 1.22;

  return compact ? Math.max(1.5, width * 0.92) : width;

}

export function guardFrameStrokeWidth(circleRadius: number) {
  return Math.max(
    1.15,
    guardRingStrokeWidth(circleRadius, false) * GUARD_FRAME_STROKE_RATIO,
  );
}



export function guardWingPathD(): string {

  return GUARD_WING_PATH_D;

}



/** Sample arc for Konva Line fallback. */
export function buildGuardWingPathPoints(): number[] {
  const steps = 24;
  const pts: number[] = [];
  const centerY = GUARD_ARC_BASE_Y;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = Math.PI - t * Math.PI;
    pts.push(
      Math.cos(angle) * GUARD_ARC_RADIUS,
      centerY - Math.sin(angle) * GUARD_ARC_RADIUS,
    );
  }
  return pts;
}



export function guardWingPathPoints(circleRadius: number): number[] {

  const scale = guardGlyphScale(circleRadius);

  const base = buildGuardWingPathPoints();

  const scaled: number[] = [];

  for (let i = 0; i < base.length; i += 2) {

    scaled.push(base[i]! * scale, base[i + 1]! * scale);

  }

  return scaled;

}

