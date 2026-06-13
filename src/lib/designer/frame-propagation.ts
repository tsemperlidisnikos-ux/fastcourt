import { closestPlayer, PLAYER_SNAP_NORM } from "@/lib/designer/player-snap";
import type { DesignerAction, DesignerFrame, DesignerObject } from "@/types/designer";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function collectBallHolderIds(objects: DesignerObject[]) {
  const ids = new Set<string>();
  for (const obj of objects) {
    if (obj.kind === "offense" && obj.hasBall) ids.add(obj.id);
  }
  return ids;
}

function getBallHolderIds(frame: DesignerFrame) {
  return collectBallHolderIds(frame.objects);
}

function getActionSequence(frame: DesignerFrame) {
  return frame.actionSequence ?? frame.actions.map((a) => a.id);
}

function findSourceByLabel(
  sourceFrame: DesignerFrame,
  targetObj: DesignerObject,
) {
  if (targetObj.label) {
    return sourceFrame.objects.find(
      (o) => o.kind === targetObj.kind && o.label === targetObj.label,
    );
  }
  const sameKind = sourceFrame.objects.filter((o) => o.kind === targetObj.kind);
  const targetIdx = targetFrameIndexAmongKind(
    sourceFrame.objects,
    targetObj,
  );
  return sameKind[targetIdx];
}

function targetFrameIndexAmongKind(
  objects: DesignerObject[],
  target: DesignerObject,
) {
  const kindObjects = objects.filter((o) => o.kind === target.kind);
  const idx = kindObjects.findIndex((o) => o.id === target.id);
  return idx >= 0 ? idx : 0;
}

function propagateAction(
  action: DesignerAction,
  objects: DesignerObject[],
  ballHolderIds: Set<string>,
  newPositions: Record<string, { x: number; y: number }>,
) {
  switch (action.type) {
    case "pass": {
      // Pass often starts at a prior action endpoint (e.g. dribble end), not at the
      // passer's token — prefer the current ball carrier as passer.
      const holder = objects.find((o) => o.kind === "offense" && o.hasBall);
      const passer = holder ?? closestPlayer(action.x1, action.y1, objects);
      if (!passer) return;
      const receiver = closestPlayer(action.x2, action.y2, objects, [passer.id]);
      if (!receiver) return;
      if (ballHolderIds.has(passer.id)) {
        ballHolderIds.delete(passer.id);
        if (receiver.kind === "offense") ballHolderIds.add(receiver.id);
      }
      break;
    }
    case "handoff": {
      const giver = closestPlayer(
        action.x1,
        action.y1,
        objects,
        [],
        PLAYER_SNAP_NORM * 2,
      );
      if (!giver || giver.kind !== "offense") return;
      const taker = closestPlayer(
        action.x2,
        action.y2,
        objects,
        [giver.id],
        PLAYER_SNAP_NORM * 2,
      );
      if (!taker || taker.kind !== "offense") return;
      newPositions[giver.id] = { x: action.x2, y: action.y2 };
      if (ballHolderIds.has(giver.id)) {
        ballHolderIds.delete(giver.id);
        ballHolderIds.add(taker.id);
      }
      break;
    }
    case "shoot": {
      const shooter = closestPlayer(action.x1, action.y1, objects);
      if (!shooter) return;
      newPositions[shooter.id] = { x: action.x2, y: action.y2 };
      ballHolderIds.delete(shooter.id);
      break;
    }
    case "cut":
    case "curl":
    case "dribble":
    case "screen": {
      const mover = closestPlayer(action.x1, action.y1, objects);
      if (!mover) return;
      newPositions[mover.id] = { x: action.x2, y: action.y2 };
      break;
    }
    default:
      break;
  }
}

/**
 * Apply source frame action sequence onto target frame players (positions + ball).
 * Does not modify target actions unless clearActions is true.
 */
export function applyActionResultsToFrame(
  sourceFrame: DesignerFrame,
  targetFrame: DesignerFrame,
  options: { clearActions?: boolean } = {},
): DesignerFrame {
  const ballHolderIds = getBallHolderIds(sourceFrame);
  const newPositions: Record<string, { x: number; y: number }> = {};
  const actionById = new Map(sourceFrame.actions.map((a) => [a.id, a]));

  for (const actionId of getActionSequence(sourceFrame)) {
    const action = actionById.get(actionId);
    if (action) {
      propagateAction(action, sourceFrame.objects, ballHolderIds, newPositions);
    }
  }

  const objects = targetFrame.objects.map((targetObj) => {
    const sourceObj = findSourceByLabel(sourceFrame, targetObj);
    if (!sourceObj) return targetObj;

    let x = sourceObj.x;
    let y = sourceObj.y;
    if (newPositions[sourceObj.id]) {
      x = clamp01(newPositions[sourceObj.id].x);
      y = clamp01(newPositions[sourceObj.id].y);
    }

    return {
      ...targetObj,
      x,
      y,
      hasBall:
        targetObj.kind === "offense" ? ballHolderIds.has(sourceObj.id) : false,
    };
  });

  return {
    ...targetFrame,
    objects,
    actions: options.clearActions ? [] : targetFrame.actions,
    actionSequence: options.clearActions ? [] : targetFrame.actionSequence,
  };
}
