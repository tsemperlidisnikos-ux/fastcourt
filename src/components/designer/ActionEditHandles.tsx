"use client";

import { Circle, Group } from "react-konva";
import type Konva from "konva";
import {
  courtNormToStage,
  stageToCourtNorm,
  type CourtCoordSpace,
} from "@/lib/designer/court-view-layout";
import {
  actionCurvePeakNorm,
  patchFromControlDrag,
  usesSymmetricCurveControls,
} from "@/lib/designer/action-geometry";
import { useDesignerStore } from "@/stores/designer-store";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import {
  konvaHandleHitWidth,
  konvaHandleRadius,
} from "@/lib/viewport/touch-targets";
import type { CourtRect, CourtType, DesignerAction } from "@/types/designer";

interface Props {
  action: DesignerAction;
  court: CourtRect;
  courtType: CourtType;
  courtCoords?: CourtCoordSpace;
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
  hitStrokeWidth,
  kind,
  onDragMove,
  onDragEnd,
}: {
  x: number;
  y: number;
  radius: number;
  hitStrokeWidth: number;
  kind: "start" | "end" | "peak" | "mid";
  onDragMove: (
    kind: "start" | "end" | "peak" | "mid",
    e: Konva.KonvaEventObject<DragEvent>,
  ) => void;
  onDragEnd: (
    kind: "start" | "end" | "peak" | "mid",
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
      hitStrokeWidth={hitStrokeWidth}
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

export function ActionEditHandles({
  action,
  court,
  courtType,
  courtCoords = "raster",
}: Props) {
  const updateAction = useDesignerStore((s) => s.updateAction);
  const coarse = useCoarsePointer();
  const handleRadius = konvaHandleRadius(coarse);
  const smallHandleRadius = konvaHandleRadius(coarse, true);
  const handleHit = konvaHandleHitWidth(coarse);

  function normToStage(nx: number, ny: number) {
    return courtNormToStage(court, courtType, nx, ny, courtCoords);
  }

  const start = normToStage(action.x1, action.y1);
  const end = normToStage(action.x2, action.y2);
  const pathControl = actionCurvePeakNorm(action);
  const pathControlStage = normToStage(pathControl.x, pathControl.y);

  function normFromDrag(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const raw = stageToCourtNorm(
      court,
      courtType,
      node.x(),
      node.y(),
      courtCoords,
    );
    return clampNorm(raw.x, raw.y);
  }

  function applyDragMove(
    kind: "start" | "end" | "peak" | "mid",
    e: Konva.KonvaEventObject<DragEvent>,
  ) {
    const norm = normFromDrag(e);
    updateAction(action.id, patchFromControlDrag(action, kind, norm.x, norm.y));
  }

  function applyDragEnd(
    kind: "start" | "end" | "peak" | "mid",
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
        radius={handleRadius}
        hitStrokeWidth={handleHit}
        kind="start"
        onDragMove={applyDragMove}
        onDragEnd={applyDragEnd}
      />
      <HandleDot
        x={end.x}
        y={end.y}
        radius={handleRadius}
        hitStrokeWidth={handleHit}
        kind="end"
        onDragMove={applyDragMove}
        onDragEnd={applyDragEnd}
      />
      {isCurved ? (
        <HandleDot
          x={pathControlStage.x}
          y={pathControlStage.y}
          radius={smallHandleRadius}
          hitStrokeWidth={handleHit}
          kind="peak"
          onDragMove={applyDragMove}
          onDragEnd={applyDragEnd}
        />
      ) : null}
      {isMidCurve ? (
        <HandleDot
          x={pathControlStage.x}
          y={pathControlStage.y}
          radius={smallHandleRadius}
          hitStrokeWidth={handleHit}
          kind="mid"
          onDragMove={applyDragMove}
          onDragEnd={applyDragEnd}
        />
      ) : null}
    </Group>
  );
}
