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

function getBallHolderObject(ctx: PropagationContext): DesignerObject | null {
  for (const id of ctx.ballHolderIds) {
    const obj = ctx.objects.find((o) => o.id === id && o.kind === "offense");
    if (obj) return obj;
  }
  return null;
}

function closestBallHolderTo(
  ctx: PropagationContext,
  x: number,
  y: number,
  maxDist = PLAYER_SNAP_NORM * 2,
): DesignerObject | null {
  let best: DesignerObject | null = null;
  let bestDist = maxDist;
  for (const id of ctx.ballHolderIds) {
    const obj = ctx.objects.find((o) => o.id === id && o.kind === "offense");
    if (!obj) continue;
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

function resolvePasser(
  action: DesignerAction,
  ctx: PropagationContext,
  holderIds: Set<string> = ctx.ballHolderIds,
): DesignerObject | null {
  if (action.sourcePlayerId && holderIds.has(action.sourcePlayerId)) {
    const explicit = ctx.objects.find(
      (o) => o.id === action.sourcePlayerId && o.kind === "offense",
    );
    if (explicit) return explicit;
  }
  const atLineStart = closestOffenseInContext(action.x1, action.y1, ctx);
  if (!atLineStart) return null;
  if (holderIds.size <= 1) {
    for (const id of holderIds) {
      const obj = ctx.objects.find((o) => o.id === id && o.kind === "offense");
      if (obj) return obj;
    }
    return atLineStart;
  }
  if (holderIds.has(atLineStart.id)) {
    return atLineStart;
  }
  let best: DesignerObject | null = null;
  let bestDist = PLAYER_SNAP_NORM * 2;
  for (const id of holderIds) {
    const obj = ctx.objects.find((o) => o.id === id && o.kind === "offense");
    if (!obj) continue;
    const pos = getEffectivePos(obj.id, ctx.objects, ctx.newPositions);
    if (!pos) continue;
    const d = Math.hypot(pos.x - action.x1, pos.y - action.y1);
    if (d < bestDist) {
      bestDist = d;
      best = obj;
    }
  }
  return best ?? atLineStart;
}

function screeningSpotForScreener(
  action: DesignerAction,
  screenerPos: { x: number; y: number },
) {
  const d1 = Math.hypot(screenerPos.x - action.x1, screenerPos.y - action.y1);
  const d2 = Math.hypot(screenerPos.x - action.x2, screenerPos.y - action.y2);
  return d1 <= d2
    ? { x: action.x2, y: action.y2 }
    : { x: action.x1, y: action.y1 };
}

function resolveScreener(
  action: DesignerAction,
  ctx: PropagationContext,
): DesignerObject | null {
  const ballHolder = getBallHolderObject(ctx);
  const excludeIds = ballHolder ? [ballHolder.id] : [];

  const candidates = ctx.objects.filter(
    (o) => o.kind === "offense" && !excludeIds.includes(o.id),
  );
  if (candidates.length === 0) {
    return closestOffenseInContext(action.x1, action.y1, ctx);
  }
  if (candidates.length === 1) return candidates[0];

  let best: DesignerObject | null = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const pos =
      getEffectivePos(candidate.id, ctx.objects, ctx.newPositions) ??
      { x: candidate.x, y: candidate.y };
    const nearStart = Math.hypot(pos.x - action.x1, pos.y - action.y1);
    const nearEnd = Math.hypot(pos.x - action.x2, pos.y - action.y2);
    const dist = Math.min(nearStart, nearEnd);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }

  return best;
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

export function getActionMoverId(
  action: DesignerAction,
  objects: DesignerObject[],
): string | null {
  const ctx: PropagationContext = {
    objects,
    ballHolderIds: collectBallHolderIds(objects),
    newPositions: {},
  };
  propagateActionToContext(action, ctx);
  const ids = Object.keys(ctx.newPositions);
  return ids[0] ?? null;
}

/** Apply one action onto a propagation context (legacy frame-propagation semantics). */
export function propagateActionToContext(
  action: DesignerAction,
  ctx: PropagationContext,
) {
  switch (action.type) {
    case "pass": {
      const passer = resolvePasser(action, ctx);
      if (!passer) return;
      const receiver = closestOffenseInContext(action.x2, action.y2, ctx, [
        passer.id,
      ]);
      if (!receiver) return;
      if (ctx.ballHolderIds.has(passer.id)) {
        ctx.ballHolderIds.delete(passer.id);
      }
      ctx.ballHolderIds.add(receiver.id);
      break;
    }
    case "handoff": {
      const giver =
        ctx.ballHolderIds.size > 1
          ? (closestBallHolderTo(ctx, action.x1, action.y1) ??
            closestOffenseInContext(
              action.x1,
              action.y1,
              ctx,
              [],
              PLAYER_SNAP_NORM * 2,
            ))
          : (getBallHolderObject(ctx) ??
            closestOffenseInContext(
              action.x1,
              action.y1,
              ctx,
              [],
              PLAYER_SNAP_NORM * 2,
            ));
      if (!giver) return;

      const meeting = { x: action.x2, y: action.y2 };
      const otherOffense = ctx.objects.filter(
        (o) => o.kind === "offense" && o.id !== giver.id,
      );
      const taker =
        otherOffense.length === 1
          ? otherOffense[0]
          : (closestOffenseInContext(
              meeting.x,
              meeting.y,
              ctx,
              [giver.id],
              PLAYER_SNAP_NORM * 2,
            ) ??
            closestOffenseInContext(
              action.x1,
              action.y1,
              ctx,
              [giver.id],
              PLAYER_SNAP_NORM * 2,
            ));
      if (!taker) return;

      ctx.newPositions[giver.id] = meeting;
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
    case "curl": {
      const mover = closestMoverInContext(action.x1, action.y1, ctx);
      if (!mover) return;
      ctx.newPositions[mover.id] = { x: action.x2, y: action.y2 };
      break;
    }
    case "dribble": {
      const mover =
        ctx.ballHolderIds.size > 1
          ? (closestBallHolderTo(ctx, action.x1, action.y1) ??
            closestMoverInContext(action.x1, action.y1, ctx))
          : (getBallHolderObject(ctx) ??
            closestMoverInContext(action.x1, action.y1, ctx));
      if (!mover) return;
      ctx.newPositions[mover.id] = { x: action.x2, y: action.y2 };
      break;
    }
    case "screen": {
      const screener = resolveScreener(action, ctx);
      if (!screener) return;
      const screenerPos =
        getEffectivePos(screener.id, ctx.objects, ctx.newPositions) ??
        { x: screener.x, y: screener.y };
      ctx.newPositions[screener.id] = screeningSpotForScreener(
        action,
        screenerPos,
      );
      break;
    }
    default:
      break;
  }
}

/** Apply simultaneous actions using one ball-possession snapshot (drill sync passes). */
export function propagateSyncActionBatch(
  actions: DesignerAction[],
  ctx: PropagationContext,
) {
  if (!actions.length) return;
  const ballSnapshot = new Set(ctx.ballHolderIds);
  const passTransfers: Array<{ from: string; to: string }> = [];
  const handoffTransfers: Array<{
    giverId: string;
    takerId: string;
    meeting: { x: number; y: number };
  }> = [];

  for (const action of actions) {
    if (action.type === "pass") {
      const passer = resolvePasser(action, ctx, ballSnapshot);
      if (!passer || !ballSnapshot.has(passer.id)) continue;
      const receiver = closestOffenseInContext(action.x2, action.y2, ctx, [
        passer.id,
      ]);
      if (!receiver) continue;
      passTransfers.push({ from: passer.id, to: receiver.id });
      continue;
    }

    if (action.type === "handoff") {
      const giver = closestOffenseInContext(
        action.x1,
        action.y1,
        ctx,
        [],
        PLAYER_SNAP_NORM * 2,
      );
      if (!giver || !ballSnapshot.has(giver.id)) continue;
      const meeting = { x: action.x2, y: action.y2 };
      const otherOffense = ctx.objects.filter(
        (o) => o.kind === "offense" && o.id !== giver.id,
      );
      const taker =
        otherOffense.length === 1
          ? otherOffense[0]
          : (closestOffenseInContext(
              meeting.x,
              meeting.y,
              ctx,
              [giver.id],
              PLAYER_SNAP_NORM * 2,
            ) ??
            closestOffenseInContext(
              action.x1,
              action.y1,
              ctx,
              [giver.id],
              PLAYER_SNAP_NORM * 2,
            ));
      if (!taker) continue;
      handoffTransfers.push({
        giverId: giver.id,
        takerId: taker.id,
        meeting,
      });
      continue;
    }

    propagateActionToContext(action, ctx);
  }

  for (const transfer of passTransfers) {
    ctx.ballHolderIds.delete(transfer.from);
    ctx.ballHolderIds.add(transfer.to);
  }
  for (const handoff of handoffTransfers) {
    ctx.newPositions[handoff.giverId] = handoff.meeting;
    ctx.ballHolderIds.delete(handoff.giverId);
    ctx.ballHolderIds.add(handoff.takerId);
  }
}

export function propagateFrameActionSequence(
  frame: DesignerFrame,
  ctx: PropagationContext,
  options?: { beforeActionId?: string },
) {
  const actionById = new Map(frame.actions.map((a) => [a.id, a]));
  const seq = frame.actionSequence ?? frame.actions.map((a) => a.id);

  for (let i = 0; i < seq.length; ) {
    const actionId = seq[i]!;
    if (options?.beforeActionId && actionId === options.beforeActionId) {
      return;
    }
    const action = actionById.get(actionId);
    if (!action) {
      i += 1;
      continue;
    }

    if (action.timing === "sync") {
      const batch: DesignerAction[] = [];
      while (i < seq.length) {
        const id = seq[i]!;
        if (options?.beforeActionId && id === options.beforeActionId) {
          if (batch.length) propagateSyncActionBatch(batch, ctx);
          return;
        }
        const current = actionById.get(id);
        if (!current || current.timing !== "sync") break;
        batch.push(current);
        i += 1;
      }
      if (batch.length) propagateSyncActionBatch(batch, ctx);
      continue;
    }

    propagateActionToContext(action, ctx);
    i += 1;
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

