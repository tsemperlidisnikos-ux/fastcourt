import { PLAYER_SNAP_NORM } from "@/lib/designer/player-snap";
import type { DesignerAction, DesignerFrame, DesignerObject } from "@/types/designer";

export interface PropagationContext {
  objects: DesignerObject[];
  ballHolderIds: Set<string>;
  newPositions: Record<string, { x: number; y: number }>;
}

export function collectBallHolderIds(objects: DesignerObject[]) {
  const ids = new Set<string>();
  for (const obj of objects) {
    if (obj.kind === "offense" && obj.hasBall) ids.add(obj.id);
  }
  return ids;
}

function getEffectivePos(
  playerId: string,
  objects: DesignerObject[],
  newPositions: Record<string, { x: number; y: number }>,
) {
  const moved = newPositions[playerId];
  if (moved) return moved;
  const player = objects.find((o) => o.id === playerId);
  return player ? { x: player.x, y: player.y } : null;
}

function closestOffenseInContext(
  x: number,
  y: number,
  ctx: PropagationContext,
  excludeIds: string[] = [],
  maxDist = PLAYER_SNAP_NORM * 2,
) {
  let best: DesignerObject | null = null;
  let bestDist = maxDist;
  for (const obj of ctx.objects) {
    if (obj.kind !== "offense" || excludeIds.includes(obj.id)) continue;
    const pos = getEffectivePos(obj.id, ctx.objects, ctx.newPositions);
    if (!pos) continue;
    const d = Math.hypot(pos.x - x, pos.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = obj;
    }
  }
  if (best) return best;

  const relaxed = PLAYER_SNAP_NORM * 4;
  let relaxedBest: DesignerObject | null = null;
  let relaxedDist = relaxed;
  for (const obj of ctx.objects) {
    if (obj.kind !== "offense" || excludeIds.includes(obj.id)) continue;
    const pos = getEffectivePos(obj.id, ctx.objects, ctx.newPositions);
    if (!pos) continue;
    const d = Math.hypot(pos.x - x, pos.y - y);
    if (d < relaxedDist) {
      relaxedDist = d;
      relaxedBest = obj;
    }
  }
  return relaxedBest;
}

function closestMoverInContext(
  x: number,
  y: number,
  ctx: PropagationContext,
  excludeIds: string[] = [],
  maxDist = PLAYER_SNAP_NORM * 2,
) {
  const offense = closestOffenseInContext(x, y, ctx, excludeIds, maxDist);
  if (offense) return offense;

  let best: DesignerObject | null = null;
  let bestDist = maxDist;
  for (const obj of ctx.objects) {
    if (obj.kind !== "defense" || excludeIds.includes(obj.id)) continue;
    const pos = getEffectivePos(obj.id, ctx.objects, ctx.newPositions);
    if (!pos) continue;
    const d = Math.hypot(pos.x - x, pos.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = obj;
    }
  }
  return best;
}

export function createPropagationContext(frame: DesignerFrame): PropagationContext {
  return {
    objects: frame.objects,
    ballHolderIds: collectBallHolderIds(frame.objects),
    newPositions: {},
  };
}

/** Apply one action onto a propagation context (legacy frame-propagation semantics). */
export function propagateActionToContext(
  action: DesignerAction,
  ctx: PropagationContext,
) {
  switch (action.type) {
    case "pass": {
      const passer = closestOffenseInContext(action.x1, action.y1, ctx);
      if (!passer) return;
      const receiver = closestOffenseInContext(action.x2, action.y2, ctx, [
        passer.id,
      ]);
      if (!receiver) return;
      ctx.ballHolderIds.delete(passer.id);
      ctx.ballHolderIds.add(receiver.id);
      break;
    }
    case "handoff": {
      const giver = closestOffenseInContext(
        action.x1,
        action.y1,
        ctx,
        [],
        PLAYER_SNAP_NORM * 2,
      );
      if (!giver) return;
      const taker = closestOffenseInContext(
        action.x2,
        action.y2,
        ctx,
        [giver.id],
        PLAYER_SNAP_NORM * 2,
      );
      if (!taker) return;
      ctx.newPositions[giver.id] = { x: action.x2, y: action.y2 };
      if (ctx.ballHolderIds.has(giver.id)) {
        ctx.ballHolderIds.delete(giver.id);
        ctx.ballHolderIds.add(taker.id);
      }
      break;
    }
    case "shoot": {
      const shooter = closestMoverInContext(action.x1, action.y1, ctx);
      if (!shooter) return;
      ctx.newPositions[shooter.id] = { x: action.x2, y: action.y2 };
      ctx.ballHolderIds.delete(shooter.id);
      break;
    }
    case "cut":
    case "curl":
    case "dribble":
    case "screen": {
      const mover = closestMoverInContext(action.x1, action.y1, ctx);
      if (!mover) return;
      ctx.newPositions[mover.id] = { x: action.x2, y: action.y2 };
      break;
    }
    default:
      break;
  }
}

/** Resolve offense player at normalized coords (playback / UI helpers). */
export function closestOffenseAt(
  x: number,
  y: number,
  objects: DesignerObject[],
  newPositions: Record<string, { x: number; y: number }> = {},
  excludeIds: string[] = [],
) {
  return closestOffenseInContext(
    x,
    y,
    { objects, ballHolderIds: new Set(), newPositions },
    excludeIds,
  );
}

