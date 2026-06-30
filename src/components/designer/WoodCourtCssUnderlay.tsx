"use client";

import { memo, useMemo } from "react";
import {
  courtWoodPatternCssStyle,
  courtWoodUnderlayInnerSize,
} from "@/lib/designer/court-wood-pattern-css";

function WoodCourtCssUnderlayInner({
  x,
  y,
  width,
  height,
  woodTextureId,
  floorColor,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  woodTextureId?: string | null;
  floorColor: string;
}) {
  const floorSpanPx = Math.max(width, height);
  const pattern = useMemo(
    () => courtWoodPatternCssStyle(woodTextureId, floorSpanPx, floorColor),
    [woodTextureId, floorSpanPx, floorColor],
  );
  const inner = useMemo(
    () => courtWoodUnderlayInnerSize(woodTextureId, width, height),
    [woodTextureId, width, height],
  );

  if (inner.rotate) {
    return (
      <div
        aria-hidden
        className="fc-wood-court-underlay"
        style={{
          position: "absolute",
          left: x,
          top: y,
          width,
          height,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: inner.width,
            height: inner.height,
            transform: "translate(-50%, -50%) rotate(90deg)",
            ...pattern,
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="fc-wood-court-underlay"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        pointerEvents: "none",
        zIndex: 0,
        ...pattern,
      }}
    />
  );
}

export const WoodCourtCssUnderlay = memo(WoodCourtCssUnderlayInner);
