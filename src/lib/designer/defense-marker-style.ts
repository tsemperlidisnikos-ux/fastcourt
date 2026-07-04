export type DefenseMarkerStyle = "mark" | "guard";



export const DEFENSE_MARKER_STYLES: DefenseMarkerStyle[] = ["mark", "guard"];



/** FastDraw guard red — outline and wing fill. */
export const GUARD_MARKER_COLOR = "#e2231a";

/** Solid wing interior. */
export const GUARD_MARKER_FILL = "#e2231a";

/** Jersey number inside guard ring. */
export const GUARD_MARKER_LABEL_COLOR = "#111111";



/** Guard glyph — shared by sidebar SVG and court Konva. */

/** Canonical scale reference (court ringRadius maps 1:1 here). */
export const GUARD_CIRCLE_RADIUS = 7.2;

/** Uniform size boost for the whole guard glyph (wings + ring + label). */
export const GUARD_GLYPH_SIZE_SCALE = 1.12;

/** Drawn ring — smaller than scale ref so wings stay prominent. */

export const GUARD_RING_RADIUS = 4;
export const GUARD_CIRCLE_STROKE = 2.15;



/** Outer edge of ring — wing inner edge meets here at 12 o'clock (no top gap). */

export const GUARD_OUTER_RADIUS =

  GUARD_RING_RADIUS + GUARD_CIRCLE_STROKE / 2;



/** Inner wing arc Q control (tuned for flush join at 12 o'clock). */

const GUARD_INNER_Q_CTRL_X = 3.9 * (GUARD_OUTER_RADIUS / 8.6);

const GUARD_INNER_Q_CTRL_Y = -8.55 * (GUARD_OUTER_RADIUS / 8.6);



/** Number + ring scale vs court sizing reference. */

export const GUARD_RING_TO_GLYPH_RATIO = GUARD_RING_RADIUS / GUARD_CIRCLE_RADIUS;



/** Wing outer peak — rounded cap (Q arc), not a sharp point. */
const GUARD_WING_PEAK_Y = -8.5;
const GUARD_WING_TIP_X = 11.5;
const GUARD_WING_TIP_Y = 1.35;
/** Half-width of the rounded top shoulder (quadratic arc endpoints). */
const GUARD_WING_TOP_SHOULDER_X = 4.1;
const GUARD_WING_TOP_SHOULDER_Y = -8.22;
const GUARD_WING_TOP_CTRL_Y = GUARD_WING_PEAK_Y;

/**
 * Rounded-top wings + inner curve flush on ring at top (reference photo).
 * Konva-safe: M, C, L, Q, Z only.
 */
export const GUARD_WING_PATH_D = [
  `M -${GUARD_WING_TIP_X} ${GUARD_WING_TIP_Y}`,
  `C -12.2 -0.4 -7.2 -7.65 -${GUARD_WING_TOP_SHOULDER_X} ${GUARD_WING_TOP_SHOULDER_Y}`,
  `Q 0 ${GUARD_WING_TOP_CTRL_Y} ${GUARD_WING_TOP_SHOULDER_X} ${GUARD_WING_TOP_SHOULDER_Y}`,
  `C 7.2 -7.65 12.2 -0.4 ${GUARD_WING_TIP_X} ${GUARD_WING_TIP_Y}`,

  `L ${(GUARD_OUTER_RADIUS * Math.cos(-0.62)).toFixed(2)} ${(GUARD_OUTER_RADIUS * Math.sin(-0.62)).toFixed(2)}`,

  `Q ${GUARD_INNER_Q_CTRL_X.toFixed(2)} ${GUARD_INNER_Q_CTRL_Y.toFixed(2)} 0 -${GUARD_OUTER_RADIUS}`,

  `Q -${GUARD_INNER_Q_CTRL_X.toFixed(2)} ${GUARD_INNER_Q_CTRL_Y.toFixed(2)} ${(GUARD_OUTER_RADIUS * Math.cos(-2.52)).toFixed(2)} ${(GUARD_OUTER_RADIUS * Math.sin(-2.52)).toFixed(2)}`,

  "Z",

].join(" ");



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

  return (
    circleRadius *
    (GUARD_WING_TIP_X / GUARD_CIRCLE_RADIUS) *
    GUARD_GLYPH_SIZE_SCALE
  );

}



export function guardRingStrokeWidth(circleRadius: number, compact = false) {

  const scale = circleRadius / GUARD_CIRCLE_RADIUS;

  const width = GUARD_CIRCLE_STROKE * scale;

  return compact ? Math.max(1, width * 0.85) : width;

}



export function guardWingPathD(): string {

  return GUARD_WING_PATH_D;

}



/** Sample path for Konva Line fallback. */

export function buildGuardWingPathPoints(): number[] {

  const steps = 20;

  const pts: number[] = [];

  const outer: Array<[number, number]> = [

    [-GUARD_WING_TIP_X, GUARD_WING_TIP_Y],

    [-10.8, -0.05],
    [-7.2, -7.65],
    [-GUARD_WING_TOP_SHOULDER_X, GUARD_WING_TOP_SHOULDER_Y],
    [0, GUARD_WING_TOP_CTRL_Y],
    [GUARD_WING_TOP_SHOULDER_X, GUARD_WING_TOP_SHOULDER_Y],
    [7.2, -7.65],
    [10.8, -0.05],

    [GUARD_WING_TIP_X, GUARD_WING_TIP_Y],

  ];

  for (const [x, y] of outer) pts.push(x, y);

  for (let i = 0; i <= steps; i++) {

    const t = i / steps;

    const a = -0.62 + (-2.52 - -0.62) * t;

    pts.push(Math.cos(a) * GUARD_OUTER_RADIUS, Math.sin(a) * GUARD_OUTER_RADIUS);

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

