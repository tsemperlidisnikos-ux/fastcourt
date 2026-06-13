"use client";

import { Circle, Group, Line, Rect } from "react-konva";
import {
  getShadowDimensions,
  type ShadowType,
} from "@/lib/designer/shadow-geometry";
import type { CourtRect } from "@/types/designer";

interface Props {
  type: ShadowType;
  court: CourtRect;
  scaleX?: number;
  scaleY?: number;
}

export function ShadowMarker({ type, court, scaleX = 1, scaleY = 1 }: Props) {
  const dims = getShadowDimensions(court);
  const fill = dims.fill;

  if (type === "circle") {
    return (
      <Group scaleX={scaleX} scaleY={scaleY} listening={false}>
        <Circle x={0} y={0} radius={dims.circleR} fill={fill} listening={false} />
      </Group>
    );
  }

  if (type === "triangle") {
    return (
      <Group scaleX={scaleX} scaleY={scaleY} listening={false}>
        <Line
          points={[0, -dims.triH / 2, dims.triHalf, dims.triH / 2, -dims.triHalf, dims.triH / 2]}
          closed
          fill={fill}
          lineJoin="round"
          listening={false}
        />
      </Group>
    );
  }

  if (type === "diamond") {
    const h = dims.diamondHalf;
    return (
      <Group scaleX={scaleX} scaleY={scaleY} listening={false}>
        <Line
          points={[0, -h, h, 0, 0, h, -h, 0]}
          closed
          fill={fill}
          lineJoin="round"
          listening={false}
        />
      </Group>
    );
  }

  return (
    <Group scaleX={scaleX} scaleY={scaleY} listening={false}>
      <Rect
        x={-dims.rectW / 2}
        y={-dims.rectH / 2}
        width={dims.rectW}
        height={dims.rectH}
        cornerRadius={dims.rectR}
        fill={fill}
        listening={false}
      />
    </Group>
  );
}
