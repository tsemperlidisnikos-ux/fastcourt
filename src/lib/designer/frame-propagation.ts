import {
  createPropagationContext,
  propagateFrameActionSequence,
} from "@/lib/designer/action-propagation";
import type { DesignerFrame, DesignerObject } from "@/types/designer";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
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

/**
 * Apply source frame action sequence onto target frame players (positions + ball).
 * Does not modify target actions unless clearActions is true.
 */
export function applyActionResultsToFrame(
  sourceFrame: DesignerFrame,
  targetFrame: DesignerFrame,
  options: { clearActions?: boolean } = {},
): DesignerFrame {
  const ctx = createPropagationContext(sourceFrame);
  propagateFrameActionSequence(sourceFrame, ctx);

  const { ballHolderIds, newPositions } = ctx;

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

/** Player positions + ball possession after running some or all frame actions. */
export function objectsAfterFrameActions(
  frame: DesignerFrame,
  options?: { beforeActionId?: string },
): DesignerObject[] {
  const ctx = createPropagationContext(frame);
  propagateFrameActionSequence(frame, ctx, options);

  const { ballHolderIds, newPositions } = ctx;

  return frame.objects.map((obj) => {
    const moved = newPositions[obj.id];
    return {
      ...obj,
      x: moved ? clamp01(moved.x) : obj.x,
      y: moved ? clamp01(moved.y) : obj.y,
      hasBall:
        obj.kind === "offense" ? ballHolderIds.has(obj.id) : obj.hasBall,
    };
  });
}
