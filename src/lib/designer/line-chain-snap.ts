import type { ActionType, DesignerAction } from "@/types/designer";

/** ~96px at 680px court width */
export const LINE_CHAIN_SNAP_NORM = 0.141;

export function findClosestActionLineEndpoint(
  x: number,
  y: number,
  actions: DesignerAction[],
  options?: {
    maxDist?: number;
    types?: ActionType[];
    excludeActionId?: string;
  },
) {
  const maxDist = options?.maxDist ?? LINE_CHAIN_SNAP_NORM;
  const types = options?.types ?? ["dribble"];
  let best: { x: number; y: number; dist: number; actionId: string } | null = null;

  for (const action of actions) {
    if (options?.excludeActionId && action.id === options.excludeActionId) continue;
    if (!types.includes(action.type)) continue;
    const d = Math.hypot(x - action.x2, y - action.y2);
    if (d <= maxDist && (!best || d < best.dist)) {
      best = { x: action.x2, y: action.y2, dist: d, actionId: action.id };
    }
  }

  return best;
}
