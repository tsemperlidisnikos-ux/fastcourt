import type { DesignerAction, DesignerFrame, DesignerObject } from "@/types/designer";

export function offense(
  id: string,
  label: string,
  x: number,
  y: number,
  hasBall = false,
): DesignerObject {
  return { id, kind: "offense", x, y, label, hasBall };
}

export function defense(id: string, label: string, x: number, y: number): DesignerObject {
  return { id, kind: "defense", x, y, label };
}

export function makeAction(
  type: DesignerAction["type"],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  id?: string,
): DesignerAction {
  const actionId = id ?? `a-${type}-${x1}-${y1}`;
  return {
    id: actionId,
    type,
    x1,
    y1,
    x2,
    y2,
    midX: (x1 + x2) / 2,
    midY: (y1 + y2) / 2,
    strokeWidth: 3,
    timing: "normal",
  };
}

export function makeFrame(
  objects: DesignerObject[],
  actions: DesignerAction[] = [],
  name = "Frame 1",
): DesignerFrame {
  return {
    id: "frame-test",
    name,
    objects,
    actions,
    actionSequence: actions.map((a) => a.id),
  };
}

export function makeTargetFrame(
  objects: DesignerObject[],
  name = "Frame 2",
): DesignerFrame {
  return {
    id: "frame-target",
    name,
    objects,
    actions: [],
    actionSequence: [],
  };
}

export function ballHolderLabel(frame: DesignerFrame) {
  return frame.objects.find((o) => o.kind === "offense" && o.hasBall)?.label ?? null;
}

export function ballHolderLabels(objects: DesignerObject[]) {
  return objects
    .filter((o) => o.kind === "offense" && o.hasBall)
    .map((o) => o.label ?? "")
    .sort();
}
