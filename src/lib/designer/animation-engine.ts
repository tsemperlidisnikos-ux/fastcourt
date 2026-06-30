import {
  createPropagationContext,
  getActionMoverId,
  propagateActionToContext,
  propagateSyncActionBatch,
} from "@/lib/designer/action-propagation";
import { HANDOFF_ANIM_BALL_PROGRESS } from "@/lib/designer/action-constants";
import { resolveStepAnimPhases } from "@/lib/designer/animation-timing";
import { actionPathPointAt, actionToStagePoints } from "@/lib/designer/action-geometry";
import type { CourtCoordSpace } from "@/lib/designer/court-view-layout";
import type {
  ActionType,
  CourtRect,
  CourtType,
  DesignerAction,
  DesignerFrame,
  DesignerObject,
} from "@/types/designer";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

const PATH_MOTION_TYPES = new Set<ActionType>([
  "cut",
  "curl",
  "dribble",
  "screen",
  "shoot",
  "handoff",
]);

function applyPathMotionToObjects(
  objects: DesignerObject[],
  actions: DesignerAction[],
  progress: number,
  courtType: CourtType,
): DesignerObject[] {
  const next = objects.map((obj) => ({ ...obj }));

  for (const action of actions) {
    if (!PATH_MOTION_TYPES.has(action.type)) continue;
    const moverId = getActionMoverId(action, next);
    if (!moverId) continue;
    const idx = next.findIndex((obj) => obj.id === moverId);
    if (idx < 0) continue;
    const pt = actionPathPointAt(action, progress, courtType);
    next[idx] = {
      ...next[idx]!,
      x: clamp01(pt.x),
      y: clamp01(pt.y),
    };
  }

  return next;
}

export type AnimationStepTiming = "normal" | "sync";

export interface AnimationStep {
  actionIds: string[];
  timing: AnimationStepTiming;
}

/** Groups consecutive sync actions into one step; skips optional actions. */
export function buildAnimationSteps(frame: DesignerFrame): AnimationStep[] {
  const seq = frame.actionSequence ?? frame.actions.map((a) => a.id);
  const steps: AnimationStep[] = [];
  let i = 0;

  while (i < seq.length) {
    const action = frame.actions.find((a) => a.id === seq[i]);
    if (!action || action.timing === "optional") {
      i += 1;
      continue;
    }

    if (action.timing === "sync") {
      const batch: string[] = [];
      while (i < seq.length) {
        const current = frame.actions.find((a) => a.id === seq[i]);
        if (!current || current.timing !== "sync") break;
        batch.push(current.id);
        i += 1;
      }
      if (batch.length) steps.push({ actionIds: batch, timing: "sync" });
      continue;
    }

    steps.push({ actionIds: [seq[i]], timing: "normal" });
    i += 1;
  }

  return steps;
}

export function getAnimationStepCount(frame: DesignerFrame): number {
  return buildAnimationSteps(frame).length;
}

export function getPlaybackActionIds(frame: DesignerFrame): string[] {
  return buildAnimationSteps(frame).flatMap((step) => step.actionIds);
}

function applyAnimationSteps(
  frame: DesignerFrame,
  ctx: ReturnType<typeof createPropagationContext>,
  steps: AnimationStep[],
  stepCount: number,
) {
  const actionById = new Map(frame.actions.map((a) => [a.id, a]));

  for (let g = 0; g < stepCount && g < steps.length; g++) {
    const step = steps[g];
    if (step.timing === "sync") {
      const batch = step.actionIds
        .map((actionId) => actionById.get(actionId))
        .filter((action): action is DesignerAction => !!action);
      if (batch.length) propagateSyncActionBatch(batch, ctx);
      continue;
    }
    for (const actionId of step.actionIds) {
      const action = actionById.get(actionId);
      if (action) propagateActionToContext(action, ctx);
    }
  }
}

export function computeFrameObjectsAfterSteps(
  frame: DesignerFrame,
  stepCount: number,
): DesignerObject[] {
  const ctx = createPropagationContext(frame);
  const steps = buildAnimationSteps(frame);
  applyAnimationSteps(frame, ctx, steps, stepCount);

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
  coords: CourtCoordSpace = "raster",
) {
  const full = actionToStagePoints(action, court, courtType, coords);
  return clipPolylinePoints(full, progress);
}

export interface AnimStepState {
  stepIndex: number;
  stepProgress: number;
  lineProgress: number;
  showActiveLine: boolean;
  objects: DesignerObject[];
  activeActionId: string | null;
  activeActionIds: string[];
  revealedActionIds: string[];
}

export function isAnimActionActive(
  runtime: {
    activeActionId: string | null;
    activeActionIds?: string[];
  },
  actionId: string,
) {
  return (
    runtime.activeActionId === actionId ||
    (runtime.activeActionIds?.includes(actionId) ?? false)
  );
}

export function computeAnimStepState(
  frame: DesignerFrame,
  stepIndex: number,
  stepProgress: number,
  lineProgress: number,
  courtType: CourtType = "half",
  options?: { showActiveLine?: boolean },
): AnimStepState {
  const steps = buildAnimationSteps(frame);
  const fromObjects = computeFrameObjectsAfterSteps(frame, stepIndex);
  const toObjects = computeFrameObjectsAfterSteps(frame, stepIndex + 1);
  const step = steps[stepIndex];
  const activeActionIds = step?.actionIds ?? [];
  const activeActionId = activeActionIds[0] ?? null;
  const activeActions = activeActionIds
    .map((id) => frame.actions.find((a) => a.id === id))
    .filter((a): a is DesignerAction => !!a);
  const handoffAction = activeActions.find((a) => a.type === "handoff");
  const ballTransferAtTarget = handoffAction
    ? lineProgress >= HANDOFF_ANIM_BALL_PROGRESS
    : stepProgress >= 0.98;
  const pathObjects = applyPathMotionToObjects(
    fromObjects,
    activeActions,
    stepProgress,
    courtType,
  );
  const byTarget = new Map(toObjects.map((obj) => [obj.id, obj]));
  const objects = pathObjects.map((obj) => {
    const target = byTarget.get(obj.id);
    const from = fromObjects.find((o) => o.id === obj.id);
    return {
      ...obj,
      hasBall: ballTransferAtTarget
        ? (target?.hasBall ?? obj.hasBall)
        : (from?.hasBall ?? obj.hasBall),
    };
  });
  const revealedActionIds: string[] = [];

  return {
    stepIndex,
    stepProgress,
    lineProgress,
    showActiveLine: options?.showActiveLine ?? true,
    objects,
    activeActionId,
    activeActionIds,
    revealedActionIds,
  };
}

export function computeAnimStepStateAtEased(
  frame: DesignerFrame,
  stepIndex: number,
  eased: number,
  courtType: CourtType = "half",
): AnimStepState {
  const steps = buildAnimationSteps(frame);
  const step = steps[stepIndex];
  const primaryType = step?.actionIds.length
    ? frame.actions.find((a) => a.id === step.actionIds[0])?.type
    : undefined;
  const phases = resolveStepAnimPhases(primaryType, eased);
  return computeAnimStepState(
    frame,
    stepIndex,
    phases.stepProgress,
    phases.lineProgress,
    courtType,
    { showActiveLine: phases.showActiveLine },
  );
}
