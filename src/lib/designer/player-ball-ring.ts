import type { DesignerObject } from "@/types/designer";

/** Matches CourtCanvas / PlayerMarker editor token sizing. */
export const PLAYER_TOKEN_RADIUS_FRAC = 0.028;
export const PLAYER_TOKEN_RADIUS_MIN_PX = 12;

/** Gap outside player / ball ring (legacy LINE_PLAYER_EDGE_PAD). */
export const LINE_PLAYER_EDGE_PAD_PX = 4;

/** Editor ball ring: radius + max(14px, 50%). */
export const BALL_RING_PADDING_MIN_PX = 14;
export const BALL_RING_PADDING_FRAC = 0.5;

/** Conservative ref width so snap stays outside ring on small courts. */
const SNAP_REF_COURT_WIDTH_PX = 280;

function editorPlayerTokenRadiusPx(courtWidthPx: number) {
  return Math.max(
    PLAYER_TOKEN_RADIUS_MIN_PX,
    courtWidthPx * PLAYER_TOKEN_RADIUS_FRAC,
  );
}

export function editorBallRingOuterRadiusPx(courtWidthPx: number) {
  const tokenPx = editorPlayerTokenRadiusPx(courtWidthPx);
  return tokenPx + Math.max(BALL_RING_PADDING_MIN_PX, tokenPx * BALL_RING_PADDING_FRAC);
}

/** Normalized snap radius for pass line endpoints (court width = 1). */
export function lineSnapRadiusNorm(
  player?: DesignerObject | null,
  courtWidthPx = SNAP_REF_COURT_WIDTH_PX,
) {
  const edgePadNorm = LINE_PLAYER_EDGE_PAD_PX / courtWidthPx;
  const tokenNorm = editorPlayerTokenRadiusPx(courtWidthPx) / courtWidthPx;
  if (player?.kind === "offense" && player.hasBall) {
    return editorBallRingOuterRadiusPx(courtWidthPx) / courtWidthPx + edgePadNorm;
  }
  return tokenNorm + edgePadNorm;
}
