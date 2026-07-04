"use client";

import { Circle } from "react-konva";
import type Konva from "konva";
import {
  guardHandleStageOffset,
  guardRotationFromStagePoint,
  snapGuardHandleStagePoint,
} from "@/lib/designer/defense-marker-style";
import { useDesignerStore } from "@/stores/designer-store";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { konvaHandleHitWidth, konvaHandleRadius } from "@/lib/viewport/touch-targets";

interface Props {
  objectId: string;
  ringRadius: number;
  rotation: number;
}

/** Rotation handle in marker-local coords — matches dashed guide circle in PlayerMarker. */
export function GuardRotationHandleLocal({
  objectId,
  ringRadius,
  rotation,
}: Props) {
  const setObjectRotation = useDesignerStore((s) => s.setObjectRotation);
  const coarse = useCoarsePointer();
  const handleRadius = konvaHandleRadius(coarse, true);
  const handleHit = konvaHandleHitWidth(coarse);

  const { dx, dy } = guardHandleStageOffset(ringRadius, rotation);

  function applyDrag(
    e: Konva.KonvaEventObject<DragEvent>,
    recordUndo: boolean,
  ) {
    const node = e.target;
    const snapped = snapGuardHandleStagePoint(0, 0, node.x(), node.y(), ringRadius);
    const nextRotation = guardRotationFromStagePoint(
      0,
      0,
      snapped.x,
      snapped.y,
    );
    setObjectRotation(objectId, nextRotation, { recordUndo });
    const offset = guardHandleStageOffset(ringRadius, nextRotation);
    node.position({ x: offset.dx, y: offset.dy });
  }

  return (
    <Circle
      x={dx}
      y={dy}
      radius={handleRadius}
      fill="#fff"
      stroke="#dc2626"
      strokeWidth={2}
      hitStrokeWidth={handleHit}
      draggable
      name="defenseRotationHandle"
      onPointerDown={(e) => {
        e.cancelBubble = true;
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        applyDrag(e, false);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        applyDrag(e, true);
      }}
    />
  );
}
