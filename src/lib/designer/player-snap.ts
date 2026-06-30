import type { DesignerObject } from "@/types/designer";

/** ~72px at 680px court width */
export const PLAYER_SNAP_NORM = 0.106;

/** Tight radius for ball assign — must tap near player center, not nearby placement. */
export const BALL_ASSIGN_SNAP_NORM = PLAYER_SNAP_NORM * 0.42;

export function closestPlayer(
  x: number,
  y: number,
  objects: DesignerObject[],
  excludeIds: string[] = [],
  maxDist = PLAYER_SNAP_NORM,
) {
  let best: DesignerObject | null = null;
  let min = maxDist;
  for (const obj of objects) {
    if (excludeIds.includes(obj.id)) continue;
    if (obj.kind !== "offense" && obj.kind !== "defense") continue;
    const d = Math.hypot(obj.x - x, obj.y - y);
    if (d < min) {
      min = d;
      best = obj;
    }
  }
  return best;
}
