"use client";

import { useRef } from "react";
import { Circle, Ellipse, Group, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import { ConeMarker } from "@/components/designer/ConeMarker";
import { ShadowMarker } from "@/components/designer/ShadowMarker";
import { ZoneMarker } from "@/components/designer/ZoneMarker";
import { OBJECT_COLORS } from "@/lib/designer/constants";
import { getEditorPlayerJerseyFontSize } from "@/lib/designer/action-geometry";
import { useSettingsStore } from "@/stores/settings-store";
import type { CourtRect, DesignerObject } from "@/types/designer";

interface Props {
  object: DesignerObject;
  x: number;
  y: number;
  radius: number;
  court?: CourtRect;
  compact?: boolean;
  /** Override compact font size (library thumbnails). */
  compactFontSize?: number;
  /** Override compact circle / ball ring stroke (print thumbnails). */
  compactStrokeWidth?: number;
  listening?: boolean;
  draggable?: boolean;
  onPointerUp?: (e: { cancelBubble: boolean }) => void;
  onDragEnd?: (x: number, y: number) => void;
  selected?: boolean;
}

export function PlayerMarker({
  object,
  x,
  y,
  radius,
  court,
  compact = false,
  compactFontSize,
  compactStrokeWidth,
  listening = false,
  draggable = false,
  onPointerUp,
  onDragEnd,
  selected = false,
}: Props) {
  const draggedRef = useRef(false);

  if (object.kind === "ball") return null;

  const playerDisplay = useSettingsStore((s) => s.appearance.playerDisplay);
  const fontSize = compact
    ? (compactFontSize ??
      Math.max(radius >= 5 ? 9 : 7, radius * (radius >= 5 ? 1.12 : 0.95)))
    : getEditorPlayerJerseyFontSize(
        radius,
        object.kind === "defense" ? "defense" : "offense",
      );
  const isOffense = object.kind === "offense";
  const isDefense = object.kind === "defense";
  const isPlayer = isOffense || isDefense;
  const jerseyText = isDefense
    ? object.label
      ? `X${object.label}`
      : ""
    : object.label ?? "";
  const hitListening = listening || draggable;
  const offenseCircle = isOffense && playerDisplay === "circle";
  const markerStroke = compactStrokeWidth ?? (compact ? 1.15 : 2.5);
  const jerseyFontStyle = compact ? "normal" : "bold";

  function handleDragStart(e: Konva.KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    draggedRef.current = false;
  }

  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    draggedRef.current = true;
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    const node = e.target;
    onDragEnd?.(node.x(), node.y());
  }

  function handlePointerDown(e: Konva.KonvaEventObject<PointerEvent>) {
    e.cancelBubble = true;
  }

  return (
    <Group
      x={x}
      y={y}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragMove={draggable ? handleDragMove : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      onPointerDown={hitListening ? handlePointerDown : undefined}
      onPointerUp={(e) => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        if (!hitListening) return;
        e.cancelBubble = true;
        onPointerUp?.(e);
      }}
    >
      <Circle
        radius={radius + 10}
        fill="rgba(0,0,0,0.001)"
        listening={hitListening}
      />
      {isOffense && object.hasBall ? (
        <Circle
          radius={radius + 5}
          fill="transparent"
          stroke="#111111"
          strokeWidth={markerStroke}
          listening={false}
        />
      ) : null}
      {isDefense && playerDisplay === "circle" ? (
        <Circle
          radius={radius}
          fill="#ffffff"
          stroke={OBJECT_COLORS.defense}
          strokeWidth={markerStroke}
          listening={false}
        />
      ) : null}
      {offenseCircle ? (
        <Circle
          radius={radius}
          fill="#ffffff"
          stroke="#111111"
          strokeWidth={markerStroke}
          listening={false}
        />
      ) : null}
      {isPlayer && jerseyText ? (
        <Text
          text={jerseyText}
          fontSize={fontSize}
          fill={isDefense ? OBJECT_COLORS.defense : "#111111"}
          fontStyle={jerseyFontStyle}
          fontFamily="Segoe UI, system-ui, sans-serif"
          align="center"
          verticalAlign="middle"
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          listening={false}
        />
      ) : null}
      {object.kind === "cone" ? (
        <ConeMarker scale={Math.max(0.45, radius / 18)} />
      ) : null}
      {object.kind === "text" ? (
        <Text
          text={object.label ?? "Text"}
          fontSize={fontSize}
          fill={OBJECT_COLORS.text}
          fontStyle="bold"
          offsetX={fontSize * 0.8}
          offsetY={fontSize * 0.4}
          listening={false}
        />
      ) : null}
      {object.kind === "label" ? (
        <Text
          text={object.label ?? "T"}
          fontSize={fontSize * 1.1}
          fill={OBJECT_COLORS.label}
          fontStyle="bold"
          offsetX={fontSize * 0.25}
          offsetY={fontSize * 0.45}
          listening={false}
        />
      ) : null}
      {object.kind === "flag" ? (
        <Group listening={false}>
          <Line points={[0, -radius * 0.8, 0, radius * 0.8]} stroke="#64748b" strokeWidth={2} />
          <Line
            points={[0, -radius * 0.7, radius * 0.9, -radius * 0.45, 0, -radius * 0.2]}
            closed
            fill="#94a3b8"
            stroke="#64748b"
            strokeWidth={1}
          />
        </Group>
      ) : null}
      {object.kind === "shadow" && court ? (
        <ShadowMarker
          type={object.shadowType ?? "rect"}
          court={court}
          scaleX={object.scaleX ?? 1}
          scaleY={object.scaleY ?? 1}
        />
      ) : null}
      {object.kind === "zone" && court ? (
        <ZoneMarker
          type={object.zoneType ?? "paint"}
          court={court}
          scaleX={object.scaleX ?? 1}
          scaleY={object.scaleY ?? 1}
        />
      ) : null}
      {selected && isPlayer ? (
        <Circle
          x={0}
          y={0}
          radius={radius}
          stroke="#111111"
          strokeWidth={markerStroke}
          fill="transparent"
          listening={false}
        />
      ) : null}
      {selected && (object.kind === "shadow" || object.kind === "zone") ? (
        <Circle
          x={0}
          y={0}
          radius={Math.max(radius * 1.8, 18)}
          stroke="#111111"
          strokeWidth={2}
          dash={[5, 4]}
          listening={false}
        />
      ) : null}
    </Group>
  );
}
