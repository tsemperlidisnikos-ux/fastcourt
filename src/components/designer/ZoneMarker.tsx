"use client";

import { Group, Rect } from "react-konva";
import { getZoneDimensions, type ZoneType } from "@/lib/designer/zone-geometry";
import type { CourtRect } from "@/types/designer";

interface Props {
  type: ZoneType;
  court: CourtRect;
  scaleX?: number;
  scaleY?: number;
}

export function ZoneMarker({ type, court, scaleX = 1, scaleY = 1 }: Props) {
  const dims = getZoneDimensions(court, type);

  return (
    <Group scaleX={scaleX} scaleY={scaleY} listening={false}>
      <Rect
        x={-dims.rectW / 2}
        y={-dims.rectH / 2}
        width={dims.rectW}
        height={dims.rectH}
        cornerRadius={dims.rectR}
        fill={dims.fill}
        stroke={dims.stroke}
        strokeWidth={2}
        listening={false}
      />
    </Group>
  );
}
