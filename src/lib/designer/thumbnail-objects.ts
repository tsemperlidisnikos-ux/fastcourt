import {
  closestOffenseAt,
  collectBallHolderIds,
} from "@/lib/designer/action-propagation";
import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
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

/** Ball holder at the start of a frame (before actions run). */
export function ballHolderIdsAtFrameStart(frame: DesignerFrame): Set<string> {
  const explicit = collectBallHolderIds(frame.objects);
  const inferred = inferBallHolderFromFirstAction(frame);
  if (!inferred.size) return explicit;
  if (!explicit.size) return inferred;
  const explicitId = [...explicit][0];
  const inferredId = [...inferred][0];
  if (explicitId !== inferredId) return inferred;
  return explicit;
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

function frameWithResolvedStartBall(frame: DesignerFrame): DesignerFrame {
  const ballIds = ballHolderIdsAtFrameStart(frame);
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
    out[out.length - 1] = frameWithResolvedStartBall(out[out.length - 1]);
  }
  return out;
}
