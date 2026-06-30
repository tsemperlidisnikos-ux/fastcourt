import { getEditorPlayerJerseyFontSize } from "@/lib/designer/action-geometry";
import type { DesignerObject } from "@/types/designer";

/** Matches CourtCanvas / PlayerMarker editor token sizing. */
export const PLAYER_TOKEN_RADIUS_FRAC = 0.028;
export const PLAYER_TOKEN_RADIUS_MIN_PX = 12;

/** Matches PlayerMarker editor ball ring stroke. */
export const EDITOR_BALL_RING_STROKE_PX = 2.75;

/** Half of a typical action line stroke — keeps ink off the ring outline. */
export const LINE_ENDPOINT_STROKE_CLEARANCE_PX = 2.5;

/** Gap outside regular player token when snapping line endpoints. */
export const LINE_PLAYER_EDGE_PAD_PX = 6;

/** Visible gap outside ball-possession ring (after stroke outline). */
export const LINE_BALL_HOLDER_EDGE_PAD_PX = 14;

/** Additional gap for screen stems (T-bar actions). */
export const LINE_SCREEN_EXTRA_PAD_PX = 8;

/**
 * FastDraw-style ball ring: thin outline hugging the jersey digit.
 * Radius is derived from font size so editor + thumbnails scale together.
 */
export function fastDrawBallRingOuterRadiusPx(
  fontSizePx: number,
  visualScale = 1,
) {
  const size = fontSizePx * visualScale;
  const half = size * 0.46;
  const pad = Math.max(1.5 * visualScale, half * 0.16);
  return half + pad;
}

/** Larger ball ring for main court editor only (thumbnails use fastDraw). */
export function editorBallRingOuterRadiusFromFontSize(fontSizePx: number) {
  const half = fontSizePx * 0.46;
  const pad = Math.max(3.5, half * 0.5);
  return half + pad;
}

/** Default ref width when actual court pixel width is unknown (half court editor). */
const SNAP_REF_COURT_WIDTH_PX = 680;

function editorPlayerTokenRadiusPx(courtWidthPx: number) {
  return Math.max(
    PLAYER_TOKEN_RADIUS_MIN_PX,
    courtWidthPx * PLAYER_TOKEN_RADIUS_FRAC,
  );
}

export function editorBallRingOuterRadiusPx(courtWidthPx: number) {
  const tokenPx = editorPlayerTokenRadiusPx(courtWidthPx);
  const fontSize = getEditorPlayerJerseyFontSize(tokenPx, "offense");
  return editorBallRingOuterRadiusFromFontSize(fontSize);
}

/** Outer visual edge of the ball ring including half the ring stroke width. */
export function editorBallRingVisualOuterRadiusPx(courtWidthPx: number) {
  return editorBallRingOuterRadiusPx(courtWidthPx) + EDITOR_BALL_RING_STROKE_PX / 2;
}

function ballHolderLineSnapRadiusPx(courtWidthPx: number, extraPadPx = 0) {
  return (
    editorBallRingVisualOuterRadiusPx(courtWidthPx) +
    LINE_BALL_HOLDER_EDGE_PAD_PX +
    LINE_ENDPOINT_STROKE_CLEARANCE_PX +
    extraPadPx
  );
}

function lineEdgePadNorm(
  player: DesignerObject | null | undefined,
  courtWidthPx: number,
) {
  const padPx =
    player?.kind === "offense" && player.hasBall
      ? 0
      : LINE_PLAYER_EDGE_PAD_PX;
  return padPx / courtWidthPx;
}

/** Normalized snap radius for line endpoints (court width = 1). */
export function lineSnapRadiusNorm(
  player?: DesignerObject | null,
  courtWidthPx = SNAP_REF_COURT_WIDTH_PX,
  extraPadPx = 0,
) {
  if (player?.kind === "offense" && player.hasBall) {
    return ballHolderLineSnapRadiusPx(courtWidthPx, extraPadPx) / courtWidthPx;
  }
  const edgePadNorm =
    lineEdgePadNorm(player, courtWidthPx) +
    (LINE_ENDPOINT_STROKE_CLEARANCE_PX + extraPadPx) / courtWidthPx;
  const tokenNorm = editorPlayerTokenRadiusPx(courtWidthPx) / courtWidthPx;
  return tokenNorm + edgePadNorm;
}

export function screenLineSnapRadiusNorm(
  player?: DesignerObject | null,
  courtWidthPx = SNAP_REF_COURT_WIDTH_PX,
) {
  return lineSnapRadiusNorm(player, courtWidthPx, LINE_SCREEN_EXTRA_PAD_PX);
}
