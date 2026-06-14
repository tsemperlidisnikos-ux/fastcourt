import {
  collectBallHolderIds,
  createPropagationContext,
  propagateActionToContext,
} from "@/lib/designer/action-propagation";
import type { DesignerFrame, DesignerObject } from "@/types/designer";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
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
  const actionById = new Map(sourceFrame.actions.map((a) => [a.id, a]));

  for (const actionId of getActionSequence(sourceFrame)) {
    const action = actionById.get(actionId);
    if (action) propagateActionToContext(action, ctx);
  }

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

export { collectBallHolderIds };
