import {
  createPropagationContext,
  propagateActionToContext,
} from "@/lib/designer/action-propagation";
import { HANDOFF_ANIM_BALL_PROGRESS } from "@/lib/designer/action-constants";
import { actionToStagePoints } from "@/lib/designer/action-geometry";
import type { CourtRect, CourtType, DesignerAction, DesignerFrame, DesignerObject } from "@/types/designer";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function getPlaybackActionIds(frame: DesignerFrame): string[] {
  const seq = frame.actionSequence ?? frame.actions.map((a) => a.id);
  return seq.filter((id) => {
    const action = frame.actions.find((a) => a.id === id);
    return action && action.timing !== "optional";
  });
}

export function computeFrameObjectsAfterSteps(
  frame: DesignerFrame,
  stepCount: number,
): DesignerObject[] {
  const ctx = createPropagationContext(frame);
  const actionById = new Map(frame.actions.map((a) => [a.id, a]));
  const ids = getPlaybackActionIds(frame);

  for (let i = 0; i < stepCount && i < ids.length; i++) {
    const action = actionById.get(ids[i]);
    if (action) propagateActionToContext(action, ctx);
  }

  const { ballHolderIds, newPositions } = ctx;

  return frame.objects.map((obj) => {
    const pos = newPositions[obj.id];
    if (!pos) {
      return {
        ...obj,
        hasBall:
          obj.kind === "offense" ? ballHolderIds.has(obj.id) : obj.hasBall,
      };
    }
    return {
      ...obj,
      x: clamp01(pos.x),
      y: clamp01(pos.y),
      hasBall: obj.kind === "offense" ? ballHolderIds.has(obj.id) : obj.hasBall,
    };
  });
}

export function lerpObjects(
  from: DesignerObject[],
  to: DesignerObject[],
  t: number,
  ballTransferAtTarget = t >= 0.98,
): DesignerObject[] {
  const byId = new Map(to.map((o) => [o.id, o]));
  return from.map((obj) => {
    const target = byId.get(obj.id);
    if (!target) return obj;
    return {
      ...obj,
      x: obj.x + (target.x - obj.x) * t,
      y: obj.y + (target.y - obj.y) * t,
      hasBall: ballTransferAtTarget ? target.hasBall : obj.hasBall,
    };
  });
}

/** Clip polyline to progress 0–1 along total path length. */
export function clipPolylinePoints(points: number[], progress: number): number[] {
  if (points.length < 4 || progress >= 1) return points;
  if (progress <= 0) return points.slice(0, 2);

  const segments: Array<{ len: number; i: number }> = [];
  let total = 0;
  for (let i = 0; i < points.length - 2; i += 2) {
    const len = Math.hypot(points[i + 2] - points[i], points[i + 3] - points[i + 1]);
    segments.push({ len, i });
    total += len;
  }
  if (total <= 0) return points.slice(0, 2);

  const target = total * progress;
  let acc = 0;
  const out = [points[0], points[1]];

  for (const seg of segments) {
    if (acc + seg.len >= target) {
      const local = (target - acc) / seg.len;
      const x1 = points[seg.i];
      const y1 = points[seg.i + 1];
      const x2 = points[seg.i + 2];
      const y2 = points[seg.i + 3];
      out.push(x1 + (x2 - x1) * local, y1 + (y2 - y1) * local);
      return out;
    }
    acc += seg.len;
    out.push(points[seg.i + 2], points[seg.i + 3]);
  }
  return points;
}

export function actionRevealPoints(
  action: DesignerAction,
  court: CourtRect,
  courtType: CourtType,
  progress: number,
) {
  const full = actionToStagePoints(action, court, courtType);
  return clipPolylinePoints(full, progress);
}

export interface AnimStepState {
  stepIndex: number;
  stepProgress: number;
  lineProgress: number;
  objects: DesignerObject[];
  activeActionId: string | null;
  revealedActionIds: string[];
}

export function computeAnimStepState(
  frame: DesignerFrame,
  stepIndex: number,
  stepProgress: number,
  lineProgress: number,
): AnimStepState {
  const ids = getPlaybackActionIds(frame);
  const fromObjects = computeFrameObjectsAfterSteps(frame, stepIndex);
  const toObjects = computeFrameObjectsAfterSteps(frame, stepIndex + 1);
  const activeActionId = ids[stepIndex] ?? null;
  const activeAction = activeActionId
    ? frame.actions.find((a) => a.id === activeActionId)
    : null;
  const ballTransferAtTarget =
    activeAction?.type === "handoff"
      ? lineProgress >= HANDOFF_ANIM_BALL_PROGRESS
      : stepProgress >= 0.98;
  const objects = lerpObjects(
    fromObjects,
    toObjects,
    stepProgress,
    ballTransferAtTarget,
  );
  const revealedActionIds = ids.slice(0, stepIndex);
  if (lineProgress >= 1 && activeActionId) {
    revealedActionIds.push(activeActionId);
  }

  return {
    stepIndex,
    stepProgress,
    lineProgress,
    objects,
    activeActionId,
    revealedActionIds,
  };
}
