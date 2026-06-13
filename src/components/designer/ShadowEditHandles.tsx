"use client";

import { Circle, Group } from "react-konva";
import type Konva from "konva";
import { courtNormToStage } from "@/lib/designer/court-view-layout";
import {
  clampShadowScale,
  getShadowDimensions,
} from "@/lib/designer/shadow-geometry";
import { getZoneDimensions } from "@/lib/designer/zone-geometry";
import { useDesignerStore } from "@/stores/designer-store";
import type { CourtRect, CourtType, DesignerObject } from "@/types/designer";

type Corner = "nw" | "ne" | "sw" | "se";

interface Props {
  object: DesignerObject;
  court: CourtRect;
  courtType: CourtType;
}

function getBaseHalfExtents(object: DesignerObject, court: CourtRect) {
  if (object.kind === "zone") {
    const dims = getZoneDimensions(court, object.zoneType ?? "paint");
    return { halfW: dims.rectW / 2, halfH: dims.rectH / 2, uniform: false };
  }
  const type = object.shadowType ?? "rect";
  const dims = getShadowDimensions(court);
  if (type === "circle") {
    return { halfW: dims.circleR, halfH: dims.circleR, uniform: true };
  }
  if (type === "triangle") {
    return { halfW: dims.triHalf, halfH: dims.triH / 2, uniform: true };
  }
  if (type === "diamond") {
    return { halfW: dims.diamondHalf, halfH: dims.diamondHalf, uniform: true };
  }
  return { halfW: dims.rectW / 2, halfH: dims.rectH / 2, uniform: false };
}

function cornerOffsets(corner: Corner, halfW: number, halfH: number) {
  const sx = corner.includes("e") ? 1 : -1;
  const sy = corner.includes("s") ? 1 : -1;
  return { dx: sx * halfW, dy: sy * halfH };
}

export function ShadowEditHandles({ object, court, courtType }: Props) {
  const resizeObjectScales = useDesignerStore((s) => s.resizeObjectScales);

  const scaleX = object.scaleX ?? 1;
  const scaleY = object.scaleY ?? 1;
  const base = getBaseHalfExtents(object, court);
  const halfW = base.halfW * scaleX;
  const halfH = base.halfH * scaleY;
  const center = courtNormToStage(court, courtType, object.x, object.y);
  const corners: Corner[] = ["nw", "ne", "sw", "se"];

  function applyCornerDrag(
    corner: Corner,
    e: Konva.KonvaEventObject<DragEvent>,
  ) {
    const node = e.target;
    const localX = Math.abs(node.x() - center.x);
    const localY = Math.abs(node.y() - center.y);
    let nextScaleX = clampShadowScale(localX / base.halfW);
    let nextScaleY = clampShadowScale(localY / base.halfH);
    if (base.uniform) {
      const uniform = Math.max(nextScaleX, nextScaleY);
      nextScaleX = uniform;
      nextScaleY = uniform;
    }
    resizeObjectScales(object.id, nextScaleX, nextScaleY);
    const { dx, dy } = cornerOffsets(
      corner,
      base.halfW * nextScaleX,
      base.halfH * nextScaleY,
    );
    node.position({ x: center.x + dx, y: center.y + dy });
  }

  return (
    <Group listening>
      {corners.map((corner) => {
        const { dx, dy } = cornerOffsets(corner, halfW, halfH);
        return (
          <Circle
            key={corner}
            x={center.x + dx}
            y={center.y + dy}
            radius={6}
            fill="#fff"
            stroke="#2f4563"
            strokeWidth={2}
            hitStrokeWidth={16}
            draggable
            name="shadowResizeHandle"
            onPointerDown={(e) => {
              e.cancelBubble = true;
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              applyCornerDrag(corner, e);
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              applyCornerDrag(corner, e);
            }}
          />
        );
      })}
    </Group>
  );
}
