"use client";

import { useRef, type ReactNode } from "react";
import { Arrow, Circle, Group, Line } from "react-konva";
import type Konva from "konva";
import {
  DEFAULT_ARROW_STROKE,
  PASS_DASH,
  SHOT_DASH,
} from "@/lib/designer/action-constants";
import {
  actionToStagePoints,
  resolveActionColor,
  resolveActionPointerSize,
  resolveActionStrokeWidth,
  handoffSymbolStageLines,
  screenBarPointsFromPolyline,
  stageDeltaToCourtNorm,
} from "@/lib/designer/action-geometry";
import { actionRevealPoints } from "@/lib/designer/animation-engine";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { konvaLineHitWidth } from "@/lib/viewport/touch-targets";
import type { CourtCoordSpace } from "@/lib/designer/court-view-layout";
import type { CourtRect, CourtType, DesignerAction } from "@/types/designer";

interface Props {
  action: DesignerAction;
  court: CourtRect;
  courtType: CourtType;
  preview?: boolean;
  compact?: boolean;
  /** Override default compact scale (0.52). Designer thumbnails use ~0.78. */
  compactScale?: number;
  selected?: boolean;
  interactive?: boolean;
  draggable?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
  onTranslate?: (
    id: string,
    origin: DesignerAction,
    dx: number,
    dy: number,
    recordUndo?: boolean,
  ) => void;
  removable?: boolean;
  revealProgress?: number;
  courtCoords?: CourtCoordSpace;
}

function ActionInteractionShell({
  listen,
  draggable,
  action,
  court,
  courtType,
  onPointerUp,
  onTranslate,
  courtCoords = "raster",
  children,
}: {
  listen: boolean;
  draggable: boolean;
  action: DesignerAction;
  court: CourtRect;
  courtType: CourtType;
  onPointerUp: (e: { cancelBubble: boolean }) => void;
  onTranslate?: (
    id: string,
    origin: DesignerAction,
    dx: number,
    dy: number,
    recordUndo?: boolean,
  ) => void;
  courtCoords?: CourtCoordSpace;
  children: ReactNode;
}) {
  const draggedRef = useRef(false);
  const dragOriginRef = useRef<DesignerAction | null>(null);

  const stopEvent = (e: { cancelBubble: boolean }) => {
    e.cancelBubble = true;
  };

  function applyDragOffset(node: Konva.Node, recordUndo = false) {
    const origin = dragOriginRef.current;
    if (!origin || !onTranslate) return;
    const { dx, dy } = stageDeltaToCourtNorm(
      court,
      courtType,
      node.x(),
      node.y(),
      courtCoords,
    );
    if (dx === 0 && dy === 0) return;
    onTranslate(action.id, origin, dx, dy, recordUndo);
  }

  return (
    <Group
      listening={listen}
      draggable={draggable}
      onPointerDown={stopEvent}
      onPointerUp={(e) => {
        if (draggedRef.current) {
          draggedRef.current = false;
          stopEvent(e);
          return;
        }
        onPointerUp(e);
      }}
      onDragStart={(e) => {
        stopEvent(e);
        draggedRef.current = false;
        dragOriginRef.current = { ...action };
        if (action.points?.length) {
          dragOriginRef.current.points = [...action.points];
        }
      }}
      onDragMove={(e) => {
        stopEvent(e);
        draggedRef.current = true;
        applyDragOffset(e.target);
        e.target.position({ x: 0, y: 0 });
      }}
      onDragEnd={(e) => {
        stopEvent(e);
        applyDragOffset(e.target, true);
        e.target.position({ x: 0, y: 0 });
        dragOriginRef.current = null;
      }}
    >
      {children}
    </Group>
  );
}

export function CourtActionShape({
  action,
  court,
  courtType,
  preview = false,
  compact = false,
  compactScale,
  selected = false,
  interactive = true,
  draggable = false,
  onSelect,
  onRemove,
  onTranslate,
  removable = false,
  revealProgress,
  courtCoords = "raster",
}: Props) {
  const coarse = useCoarsePointer();
  const lineHit = konvaLineHitWidth(coarse);
  const color = resolveActionColor(action);
  const strokeOpts = compact ? { compact: true, compactScale } : {};
  const strokeWidth = resolveActionStrokeWidth(
    action.strokeWidth ?? DEFAULT_ARROW_STROKE,
    court,
    courtType,
    strokeOpts,
  );
  const pointerSize = resolveActionPointerSize(court, courtType, strokeOpts);
  const points =
    revealProgress != null && revealProgress < 1
      ? actionRevealPoints(action, court, courtType, revealProgress, courtCoords)
      : actionToStagePoints(action, court, courtType, courtCoords);
  const opacity =
    preview ? 0.75 : action.timing === "optional" ? 0.82 : 1;
  const optionalDash = action.timing === "optional" ? [10, 7] : undefined;

  const stopEvent = (e: { cancelBubble: boolean }) => {
    e.cancelBubble = true;
  };

  const handlePointerUp = (e: { cancelBubble: boolean }) => {
    if (!interactive) return;
    stopEvent(e);
    if (removable && onRemove) {
      onRemove(action.id);
      return;
    }
    if (onSelect) onSelect(action.id);
  };

  const listen = interactive && !preview;
  const selectedStroke = selected ? "#9ca3af" : undefined;
  const canDrag = listen && draggable;
  const shapeProps = { listening: listen };

  function wrap(content: ReactNode) {
    if (!listen) return <>{content}</>;
    return (
      <ActionInteractionShell
        listen={listen}
        draggable={canDrag}
        action={action}
        court={court}
        courtType={courtType}
        courtCoords={courtCoords}
        onPointerUp={handlePointerUp}
        onTranslate={onTranslate}
      >
        {content}
      </ActionInteractionShell>
    );
  }

  if (action.type === "shoot") {
    const [sx, sy, ex, ey] = points;
    return wrap(
      <>
        <Line
          points={[sx, sy, ex, ey]}
          stroke={color}
          strokeWidth={strokeWidth}
          dash={optionalDash ?? SHOT_DASH}
          lineCap="round"
          opacity={opacity}
          hitStrokeWidth={lineHit}
          listening={shapeProps.listening}
        />
        <Circle
          x={ex}
          y={ey}
          radius={compact ? (compactScale != null && compactScale < 0.3 ? 3.5 : 5) : 11}
          stroke={selectedStroke ?? "#15803d"}
          strokeWidth={compact ? 1 : selected ? 3 : 2}
          fill="rgba(22,163,74,0.42)"
          listening={shapeProps.listening}
        />
      </>,
    );
  }

  if (action.type === "screen") {
    const bar = screenBarPointsFromPolyline(points, court);
    return wrap(
      <>
        <Line
          points={points}
          stroke={color}
          strokeWidth={strokeWidth}
          dash={optionalDash}
          tension={0}
          lineCap="round"
          opacity={opacity}
          hitStrokeWidth={lineHit}
          listening={shapeProps.listening}
        />
        <Line
          points={bar}
          stroke={color}
          strokeWidth={strokeWidth}
          lineCap="round"
          opacity={opacity}
          listening={shapeProps.listening}
        />
      </>,
    );
  }

  if (action.type === "pass") {
    return wrap(
      <Arrow
        points={points}
        stroke={color}
        fill={color}
        strokeWidth={strokeWidth}
        dash={optionalDash ?? PASS_DASH}
        pointerLength={pointerSize}
        pointerWidth={pointerSize}
        tension={0}
        lineCap="round"
        opacity={opacity}
        hitStrokeWidth={lineHit}
        listening={shapeProps.listening}
      />,
    );
  }

  if (action.type === "handoff") {
    const symbolLines = handoffSymbolStageLines(
      action,
      court,
      courtType,
      strokeOpts,
      courtCoords,
    );
    return wrap(
      <>
        <Arrow
          points={points}
          stroke={selectedStroke ?? color}
          fill={selectedStroke ?? color}
          strokeWidth={strokeWidth}
          dash={optionalDash}
          pointerLength={pointerSize}
          pointerWidth={pointerSize}
          tension={0}
          lineCap="round"
          lineJoin="round"
          opacity={opacity}
          hitStrokeWidth={lineHit}
          listening={shapeProps.listening}
        />
        {symbolLines.map((linePts, index) => (
          <Line
            key={`handoff-symbol-${index}`}
            points={linePts}
            stroke={selectedStroke ?? color}
            strokeWidth={strokeWidth}
            lineCap="round"
            opacity={opacity}
            listening={false}
          />
        ))}
      </>,
    );
  }

  if (action.type === "cut" || action.type === "curl") {
    return wrap(
      <Arrow
        points={points}
        stroke={selectedStroke ?? color}
        fill={selectedStroke ?? color}
        strokeWidth={strokeWidth}
        dash={optionalDash}
        pointerLength={pointerSize}
        pointerWidth={pointerSize}
        tension={0}
        lineCap="round"
        lineJoin="round"
        opacity={opacity}
        hitStrokeWidth={lineHit}
        listening={shapeProps.listening}
      />,
    );
  }

  if (action.type === "dribble") {
    return wrap(
      <Arrow
        points={points}
        stroke={selectedStroke ?? color}
        fill={selectedStroke ?? color}
        strokeWidth={strokeWidth}
        dash={optionalDash}
        pointerLength={pointerSize}
        pointerWidth={pointerSize}
        tension={0}
        lineCap="butt"
        lineJoin="miter"
        opacity={opacity}
        hitStrokeWidth={lineHit}
        listening={shapeProps.listening}
      />,
    );
  }

  return wrap(
    <Arrow
      points={points}
      stroke={selectedStroke ?? color}
      fill={selectedStroke ?? color}
      strokeWidth={strokeWidth}
      dash={optionalDash}
      pointerLength={pointerSize}
      pointerWidth={pointerSize}
      tension={0}
      lineCap="round"
      opacity={opacity}
      hitStrokeWidth={lineHit}
      listening={shapeProps.listening}
    />,
  );
}
