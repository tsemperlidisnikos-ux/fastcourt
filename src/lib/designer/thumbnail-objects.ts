import {
  closestOffenseAt,
} from "@/lib/designer/action-propagation";
import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
import { PLAYER_SNAP_NORM } from "@/lib/designer/player-snap";
import type { DesignerAction, DesignerFrame, DesignerObject } from "@/types/designer";

const BALL_START_ACTION_TYPES = new Set<DesignerAction["type"]>([
  "dribble",
  "pass",
  "handoff",
  "shoot",
]);

function actionSequence(frame: DesignerFrame) {
  return frame.actionSequence ?? frame.actions.map((a) => a.id);
}

function explicitBallHolders(frame: DesignerFrame) {
  return frame.objects.filter((o) => o.kind === "offense" && o.hasBall);
}

/** When stale data marks multiple players with the ball, pick the taker. */
function resolveMultipleBallHolders(
  frame: DesignerFrame,
  holders: DesignerObject[],
): Set<string> {
  const actionById = new Map(frame.actions.map((a) => [a.id, a]));
  for (const actionId of actionSequence(frame)) {
    const action = actionById.get(actionId);
    if (!action) continue;
    if (action.type === "handoff") {
      const giver = closestOffenseAt(action.x1, action.y1, frame.objects);
      const taker = giver
        ? holders.find((h) => h.id !== giver.id)
        : holders.find((h) => {
            const dEnd = Math.hypot(h.x - action.x2, h.y - action.y2);
            const dStart = Math.hypot(h.x - action.x1, h.y - action.y1);
            return dEnd >= dStart;
          });
      if (taker) return new Set([taker.id]);
    }
    if (action.type === "pass") {
      const receiver = closestOffenseAt(action.x2, action.y2, frame.objects);
      const matched = receiver && holders.find((h) => h.id === receiver.id);
      if (matched) return new Set([matched.id]);
    }
  }

  const inferredGiver = inferBallHolderFromFirstAction(frame);
  if (inferredGiver.size === 1) {
    const giverId = [...inferredGiver][0];
    const taker = holders.find((h) => h.id !== giverId);
    if (taker) return new Set([taker.id]);
  }

  return new Set([holders[holders.length - 1]!.id]);
}

/** Ball holder at the start of a frame (before actions run). */
export function ballHolderIdsAtFrameStart(
  frame: DesignerFrame,
  preferExplicit = false,
): Set<string> {
  const holders = explicitBallHolders(frame);

  if (preferExplicit) {
    if (holders.length === 1) return new Set([holders[0]!.id]);
    if (holders.length > 1) return resolveMultipleBallHolders(frame, holders);
  }

  const fromAction = inferBallHolderFromFirstAction(frame);

  if (fromAction.size === 1 && holders.length === 1) {
    const actionHolderId = [...fromAction][0]!;
    const explicit = holders[0]!;
    if (actionHolderId !== explicit.id) {
      const actionById = new Map(frame.actions.map((a) => [a.id, a]));
      for (const actionId of actionSequence(frame)) {
        const action = actionById.get(actionId);
        if (!action || !BALL_START_ACTION_TYPES.has(action.type)) continue;
        const explicitDist = Math.hypot(explicit.x - action.x1, explicit.y - action.y1);
        const actionPlayer = frame.objects.find((o) => o.id === actionHolderId);
        const actionPlayerDist = actionPlayer
          ? Math.hypot(actionPlayer.x - action.x1, actionPlayer.y - action.y1)
          : Infinity;
        const snap = PLAYER_SNAP_NORM * 2.5;
        if (explicitDist > snap && actionPlayerDist < snap) return fromAction;
        break;
      }
    }
  }

  if (holders.length === 1) return new Set([holders[0]!.id]);
  if (holders.length > 1) return resolveMultipleBallHolders(frame, holders);
  return fromAction;
}

function inferBallHolderFromFirstAction(frame: DesignerFrame): Set<string> {
  const actionById = new Map(frame.actions.map((a) => [a.id, a]));
  for (const actionId of actionSequence(frame)) {
    const action = actionById.get(actionId);
    if (!action || !BALL_START_ACTION_TYPES.has(action.type)) continue;
    const player = closestOffenseAt(action.x1, action.y1, frame.objects);
    if (player) return new Set([player.id]);
  }
  return new Set();
}

function frameWithResolvedStartBall(
  frame: DesignerFrame,
  preferExplicit = false,
): DesignerFrame {
  const ballIds = ballHolderIdsAtFrameStart(frame, preferExplicit);
  if (!ballIds.size) return frame;
  return {
    ...frame,
    objects: frame.objects.map((o) =>
      o.kind === "offense" ? { ...o, hasBall: ballIds.has(o.id) } : o,
    ),
  };
}

/**
 * Designer strip thumbnail: start positions, start-of-frame ball possession.
 */
export function frameObjectsForDesignerThumbnail(
  frame: DesignerFrame,
): DesignerObject[] {
  const ballIds = ballHolderIdsAtFrameStart(frame);
  return frame.objects
    .filter((o) => o.kind !== "ball")
    .map((o) =>
      o.kind === "offense" ? { ...o, hasBall: ballIds.has(o.id) } : o,
    );
}

/** Propagate each frame from the previous so thumbnails match the play chain. */
export function framesForDesignerThumbnails(
  frames: DesignerFrame[],
): DesignerFrame[] {
  if (!frames.length) return [];
  const out = frames.map((f) => ({
    ...f,
    objects: f.objects.map((o) => ({ ...o })),
  }));
  for (let i = 0; i < out.length - 1; i++) {
    out[i] = frameWithResolvedStartBall(out[i]);
    out[i + 1] = applyActionResultsToFrame(out[i], out[i + 1]);
  }
  if (out.length === 1) {
    out[0] = frameWithResolvedStartBall(out[0]);
  } else {
    out[out.length - 1] = frameWithResolvedStartBall(
      out[out.length - 1]!,
      true,
    );
  }
  return out;
}
