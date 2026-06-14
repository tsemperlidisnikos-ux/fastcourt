import {
  buildSymmetricCurveControls,
  controls8ToActionPatch,
  curveTypeForAction,
  pointBulgeFromChord,
  resolveActionControls8,
  symmetrizeDribbleMid,
  usesSymmetricCurveControls,
} from "@/lib/designer/action-geometry";
import type { ActionType, DesignerAction } from "@/types/designer";

function clearStrokeFields(): Partial<DesignerAction> {
  return {
    c1x: undefined,
    c1y: undefined,
    c2x: undefined,
    c2y: undefined,
    points: undefined,
    isFreehand: undefined,
  };
}

function bulgeFromAction(action: DesignerAction) {
  const { x1, y1, x2, y2 } = action;
  if (usesSymmetricCurveControls(action.type)) {
    const controls = resolveActionControls8(action);
    return pointBulgeFromChord(controls[2], controls[3], x1, y1, x2, y2);
  }
  if (
    (action.type === "dribble" || action.type === "handoff") &&
    action.midX != null &&
    action.midY != null
  ) {
    return pointBulgeFromChord(action.midX, action.midY, x1, y1, x2, y2);
  }
  return 0;
}

function dribbleMidFromAction(action: DesignerAction) {
  const { x1, y1, x2, y2 } = action;
  if (action.midX != null && action.midY != null) {
    return symmetrizeDribbleMid(x1, y1, x2, y2, action.midX, action.midY);
  }
  if (usesSymmetricCurveControls(action.type)) {
    const controls = resolveActionControls8(action);
    return symmetrizeDribbleMid(x1, y1, x2, y2, controls[2], controls[3]);
  }
  return symmetrizeDribbleMid(x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2);
}

/** Convert an existing action to another line type while preserving endpoints. */
export function convertActionType(
  action: DesignerAction,
  newType: ActionType,
): Partial<DesignerAction> {
  if (action.type === newType) return { type: newType };

  const { x1, y1, x2, y2 } = action;
  const cleared = clearStrokeFields();

  if (newType === "pass" || newType === "shoot") {
    return {
      type: newType,
      x1,
      y1,
      x2,
      y2,
      midX: (x1 + x2) / 2,
      midY: (y1 + y2) / 2,
      ...cleared,
    };
  }

  if (newType === "dribble" || newType === "handoff") {
    const mid = dribbleMidFromAction(action);
    return {
      type: newType,
      x1,
      y1,
      x2,
      y2,
      midX: mid.mx,
      midY: mid.my,
      ...cleared,
    };
  }

  if (usesSymmetricCurveControls(newType)) {
    const curveType = curveTypeForAction(newType);
    let bulge = bulgeFromAction(action);
    if (newType === "curl" && action.type !== "curl" && Math.abs(bulge) < 0.04) {
      bulge = 0.08;
    }
    const sym = buildSymmetricCurveControls(x1, y1, x2, y2, bulge, curveType);
    return {
      type: newType,
      points: undefined,
      isFreehand: undefined,
      ...controls8ToActionPatch([
        x1,
        y1,
        sym.c1x,
        sym.c1y,
        sym.c2x,
        sym.c2y,
        x2,
        y2,
      ]),
    };
  }

  return { type: newType, ...cleared };
}
