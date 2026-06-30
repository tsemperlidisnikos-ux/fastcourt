"use client";

import { useRef } from "react";
import { Circle, Group, Line, Text } from "react-konva";
import type Konva from "konva";
import { ConeMarker } from "@/components/designer/ConeMarker";
import { ShadowMarker } from "@/components/designer/ShadowMarker";
import { ZoneMarker } from "@/components/designer/ZoneMarker";
import { OBJECT_COLORS } from "@/lib/designer/constants";
import { DEFAULT_APP_FONT_KONVA } from "@/lib/config";
import { formatDefenseDisplayLabel } from "@/lib/designer/player-limits";
import { getEditorPlayerJerseyFontSize } from "@/lib/designer/action-geometry";
import { editorBallRingOuterRadiusFromFontSize, fastDrawBallRingOuterRadiusPx } from "@/lib/designer/player-ball-ring";
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
  /** Extra radius for ball-possession ring (legacy additive override). */
  ballRingExtra?: number;
  /** Ball ring stroke width override. */
  ballRingStrokeWidth?: number;
  /** Court editor vs thumbnail ball ring styling. */
  ballRingMode?: "editor" | "thumbnail";
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
  ballRingExtra,
  ballRingStrokeWidth,
  ballRingMode,
  listening = false,
  draggable = false,
  onPointerUp,
  onDragEnd,
  selected = false,
}: Props) {
  const draggedRef = useRef(false);
  const playerDisplay = useSettingsStore((s) => s.appearance.playerDisplay);
  const hitListening = listening || draggable;

  if (object.kind === "ball") {
    const ballRadius = Math.max(6, radius * 0.42);

    function handleBallDragStart(e: Konva.KonvaEventObject<DragEvent>) {
      e.cancelBubble = true;
      draggedRef.current = false;
    }

    function handleBallDragMove(e: Konva.KonvaEventObject<DragEvent>) {
      e.cancelBubble = true;
      draggedRef.current = true;
    }

    function handleBallDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
      e.cancelBubble = true;
      const node = e.target;
      onDragEnd?.(node.x(), node.y());
    }

    return (
      <Group
        x={x}
        y={y}
        draggable={draggable}
        onDragStart={draggable ? handleBallDragStart : undefined}
        onDragMove={draggable ? handleBallDragMove : undefined}
        onDragEnd={draggable ? handleBallDragEnd : undefined}
        onPointerDown={hitListening ? (e) => { e.cancelBubble = true; } : undefined}
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
          radius={ballRadius + 8}
          fill="rgba(0,0,0,0.001)"
          listening={hitListening}
        />
        <Circle
          radius={ballRadius}
          fill={OBJECT_COLORS.ball}
          stroke="#111111"
          strokeWidth={1.5}
          listening={false}
        />
      </Group>
    );
  }
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
  const circleDisplayMode = playerDisplay === "circle";
  const showCircleRing = compact
    ? circleDisplayMode
    : circleDisplayMode || selected;
  const ringRadius = radius * 1.12;
  const hasBallRing = isOffense && !!object.hasBall;
  const offenseCircle = isOffense && showCircleRing && !hasBallRing;
  const defenseCircle = isDefense && (showCircleRing || !compact);
  const showMarkerRing = offenseCircle || defenseCircle;
  const labelRadius =
    isPlayer && (showCircleRing || showMarkerRing) ? ringRadius : radius;
  const jerseyText = isDefense
    ? formatDefenseDisplayLabel(object.label)
    : object.label ?? "";
  const textFrameRadius = showMarkerRing ? ringRadius : labelRadius;
  const jerseyBoxHeight = textFrameRadius * 2;
  const jerseyBoxWidth =
    jerseyText.length > 1
      ? Math.max(textFrameRadius * 2.5, fontSize * 0.58 * jerseyText.length)
      : textFrameRadius * 2;
  const displayFontSize = showMarkerRing
    ? Math.min(
        fontSize,
        Math.round(ringRadius * (jerseyText.length > 1 ? 1.15 : 1.22)),
      )
    : fontSize;
  const markerStroke = compactStrokeWidth ?? (compact ? 1 : 2.75);
  const offenseRingStroke = "#000000";
  const jerseyFontStyle = "bold";
  const markerHitRadius =
    isPlayer && (showCircleRing || showMarkerRing)
      ? ringRadius + 5
      : radius + 6;
  const resolvedBallMode =
    ballRingMode ?? (compact ? "thumbnail" : "editor");
  const ballRingRadius =
    ballRingExtra != null
      ? radius + ballRingExtra
      : resolvedBallMode === "editor"
        ? editorBallRingOuterRadiusFromFontSize(fontSize)
        : fastDrawBallRingOuterRadiusPx(fontSize);
  const ballStroke =
    ballRingStrokeWidth ?? (resolvedBallMode === "editor" ? 2.75 : 1);
  const ballStrokeColor = "#000000";

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
        radius={markerHitRadius}
        fill="rgba(0,0,0,0.001)"
        listening={hitListening}
      />
      {isDefense && defenseCircle ? (
        <Circle
          radius={ringRadius}
          fill="transparent"
          stroke={OBJECT_COLORS.defense}
          strokeWidth={markerStroke}
          strokeScaleEnabled={false}
          listening={false}
        />
      ) : null}
      {offenseCircle ? (
        <Circle
          radius={ringRadius}
          fill="transparent"
          stroke={offenseRingStroke}
          strokeWidth={markerStroke}
          strokeScaleEnabled={false}
          listening={false}
        />
      ) : null}
      {isPlayer && jerseyText ? (
        <Text
          text={jerseyText}
          fontSize={displayFontSize}
          fill={isDefense ? OBJECT_COLORS.defense : "#111111"}
          fontStyle={jerseyFontStyle}
          fontFamily={DEFAULT_APP_FONT_KONVA}
          align="center"
          verticalAlign="middle"
          x={-jerseyBoxWidth / 2}
          y={-jerseyBoxHeight / 2}
          width={jerseyBoxWidth}
          height={jerseyBoxHeight}
          listening={false}
        />
      ) : null}
      {hasBallRing ? (
        <Circle
          radius={ballRingRadius}
          fill="transparent"
          stroke={ballStrokeColor}
          strokeWidth={ballStroke}
          strokeScaleEnabled={false}
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
      {selected && isPlayer && !showCircleRing && !hasBallRing ? (
        <Circle
          x={0}
          y={0}
          radius={radius}
          stroke="#64748b"
          strokeWidth={markerStroke}
          dash={[5, 4]}
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
