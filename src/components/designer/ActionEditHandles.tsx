"use client";

import { Circle, Group } from "react-konva";
import type Konva from "konva";
import {
  courtNormToStage,
  stageToCourtNorm,
} from "@/lib/designer/court-view-layout";
import {
  patchFromControlDrag,
  resolveActionControls8,
  usesSymmetricCurveControls,
} from "@/lib/designer/action-geometry";
import { useDesignerStore } from "@/stores/designer-store";
import type { CourtRect, CourtType, DesignerAction } from "@/types/designer";

interface Props {
  action: DesignerAction;
  court: CourtRect;
  courtType: CourtType;
}

function clampNorm(x: number, y: number) {
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

function HandleDot({
  x,
  y,
  radius,
  kind,
  onDragMove,
  onDragEnd,
}: {
  x: number;
  y: number;
  radius: number;
  kind: "start" | "end" | "c1" | "c2" | "mid";
  onDragMove: (
    kind: "start" | "end" | "c1" | "c2" | "mid",
    e: Konva.KonvaEventObject<DragEvent>,
  ) => void;
  onDragEnd: (
    kind: "start" | "end" | "c1" | "c2" | "mid",
    e: Konva.KonvaEventObject<DragEvent>,
  ) => void;
}) {
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={radius >= 7 ? "#fff" : "#94a3b8"}
      stroke={radius >= 7 ? "#2f4563" : "#475569"}
      strokeWidth={radius >= 7 ? 2 : 1.5}
      hitStrokeWidth={18}
      draggable
      onPointerDown={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        onDragMove(kind, e);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        onDragEnd(kind, e);
      }}
    />
  );
}

export function ActionEditHandles({ action, court, courtType }: Props) {
  const updateAction = useDesignerStore((s) => s.updateAction);

  const start = courtNormToStage(court, courtType, action.x1, action.y1);
  const end = courtNormToStage(court, courtType, action.x2, action.y2);

  const controls8 = resolveActionControls8(action);
  const c1 = courtNormToStage(court, courtType, controls8[2], controls8[3]);
  const c2 = courtNormToStage(court, courtType, controls8[4], controls8[5]);

  const mid = courtNormToStage(
    court,
    courtType,
    action.midX ?? (action.x1 + action.x2) / 2,
    action.midY ?? (action.y1 + action.y2) / 2,
  );

  function normFromDrag(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const raw = stageToCourtNorm(court, courtType, node.x(), node.y());
    return clampNorm(raw.x, raw.y);
  }

  function applyDragMove(
    kind: "start" | "end" | "c1" | "c2" | "mid",
    e: Konva.KonvaEventObject<DragEvent>,
  ) {
    const norm = normFromDrag(e);
    updateAction(action.id, patchFromControlDrag(action, kind, norm.x, norm.y));
  }

  function applyDragEnd(
    kind: "start" | "end" | "c1" | "c2" | "mid",
    e: Konva.KonvaEventObject<DragEvent>,
  ) {
    const norm = normFromDrag(e);
    updateAction(
      action.id,
      patchFromControlDrag(action, kind, norm.x, norm.y),
      { recordUndo: true },
    );
  }

  const isCurved = usesSymmetricCurveControls(action.type);
  const isMidCurve = action.type === "dribble" || action.type === "handoff";

  return (
    <Group
      listening
      onPointerDown={(e) => {
        e.cancelBubble = true;
      }}
    >
      <HandleDot
        x={start.x}
        y={start.y}
        radius={7}
        kind="start"
        onDragMove={applyDragMove}
        onDragEnd={applyDragEnd}
      />
      <HandleDot
        x={end.x}
        y={end.y}
        radius={7}
        kind="end"
        onDragMove={applyDragMove}
        onDragEnd={applyDragEnd}
      />
      {isCurved ? (
        <>
          <HandleDot
            x={c1.x}
            y={c1.y}
            radius={5}
            kind="c1"
            onDragMove={applyDragMove}
            onDragEnd={applyDragEnd}
          />
          <HandleDot
            x={c2.x}
            y={c2.y}
            radius={5}
            kind="c2"
            onDragMove={applyDragMove}
            onDragEnd={applyDragEnd}
          />
        </>
      ) : null}
      {isMidCurve ? (
        <HandleDot
          x={mid.x}
          y={mid.y}
          radius={5}
          kind="mid"
          onDragMove={applyDragMove}
          onDragEnd={applyDragEnd}
        />
      ) : null}
    </Group>
  );
}
