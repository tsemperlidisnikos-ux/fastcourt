"use client";

import { Circle, Group, Path, Text } from "react-konva";
import { DEFAULT_APP_FONT_KONVA } from "@/lib/config";
import {
  GUARD_MARKER_COLOR,
  GUARD_MARKER_LABEL_COLOR,
  GUARD_MENU_GLYPH_SCALE,
  GUARD_MENU_STROKE,
  GUARD_RING_RADIUS,
  GUARD_RING_TO_GLYPH_RATIO,
  GUARD_WING_PATH_D,
  guardGlyphScale,
  guardFrameStrokeWidth,
  guardRingStrokeWidth,
} from "@/lib/designer/defense-marker-style";

export type GuardGlyphPart = "full" | "arc" | "ring";

interface KonvaProps {
  mode: "konva";
  circleRadius: number;
  label?: string;
  labelFontSize: number;
  labelBoxWidth: number;
  labelBoxHeight: number;
  /** Rotates arc only — ring + label stay upright. */
  arcRotationDeg?: number;
  /** court = main canvas; frame = sidebar / library thumbnails. */
  strokeVariant?: "court" | "frame";
  part?: GuardGlyphPart;
}

interface SvgProps {
  mode: "svg";
  size?: number;
  label?: string;
}

type Props = KonvaProps | SvgProps;

const MENU_LABEL_SIZE = 7.8 * GUARD_RING_TO_GLYPH_RATIO;

/** Centered viewBox for toolbar icon (∩ arc above circle). */
const MENU_VIEWBOX = "-10.5 -14.8 21 17.8";

function GuardArcArt({
  strokeWidth,
  mode,
}: {
  strokeWidth: number;
  mode: "svg" | "konva";
}) {
  if (mode === "svg") {
    return (
      <path
        d={GUARD_WING_PATH_D}
        fill="none"
        stroke={GUARD_MARKER_COLOR}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  }

  return (
    <Path
      data={GUARD_WING_PATH_D}
      fill="transparent"
      stroke={GUARD_MARKER_COLOR}
      strokeWidth={strokeWidth}
      lineJoin="round"
      lineCap="round"
      strokeScaleEnabled={false}
      listening={false}
    />
  );
}

function GuardRingArt({
  label,
  labelFontSize,
  labelBoxWidth,
  labelBoxHeight,
  strokeWidth,
  mode,
}: {
  label?: string;
  labelFontSize: number;
  labelBoxWidth: number;
  labelBoxHeight: number;
  strokeWidth: number;
  mode: "svg" | "konva";
}) {
  const displayLabel = label ?? "1";
  const ringLabelWidth = Math.max(labelBoxWidth, GUARD_RING_RADIUS * 2.1);
  const ringLabelHeight = Math.max(labelBoxHeight, GUARD_RING_RADIUS * 2);

  if (mode === "svg") {
    return (
      <>
        <circle
          r={GUARD_RING_RADIUS}
          fill="none"
          stroke={GUARD_MARKER_COLOR}
          strokeWidth={strokeWidth}
        />
        <text
          x={0}
          y={0}
          fill={GUARD_MARKER_LABEL_COLOR}
          fontSize={labelFontSize}
          fontWeight="700"
          fontFamily="Arial, sans-serif"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {displayLabel}
        </text>
      </>
    );
  }

  return (
    <>
      <Circle
        radius={GUARD_RING_RADIUS}
        fill="transparent"
        stroke={GUARD_MARKER_COLOR}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        listening={false}
      />
      <Text
        text={displayLabel}
        fontSize={labelFontSize}
        fill={GUARD_MARKER_LABEL_COLOR}
        fontStyle="bold"
        fontFamily={DEFAULT_APP_FONT_KONVA}
        align="center"
        verticalAlign="middle"
        rotation={0}
        x={-ringLabelWidth / 2}
        y={-ringLabelHeight / 2}
        width={ringLabelWidth}
        height={ringLabelHeight}
        listening={false}
      />
    </>
  );
}

/** Single art layer — SVG (toolbar) and Konva (court). */
export function GuardGlyphArt({
  label,
  labelFontSize,
  labelBoxWidth,
  labelBoxHeight,
  strokeWidth,
  mode,
  part = "full",
  arcRotationDeg = 0,
}: {
  label?: string;
  labelFontSize: number;
  labelBoxWidth: number;
  labelBoxHeight: number;
  strokeWidth: number;
  mode: "svg" | "konva";
  part?: GuardGlyphPart;
  arcRotationDeg?: number;
}) {
  const showArc = part === "full" || part === "arc";
  const showRing = part === "full" || part === "ring";

  const arc = showArc ? (
    <GuardArcArt strokeWidth={strokeWidth} mode={mode} />
  ) : null;

  const ring = showRing ? (
    <GuardRingArt
      label={label}
      labelFontSize={labelFontSize}
      labelBoxWidth={labelBoxWidth}
      labelBoxHeight={labelBoxHeight}
      strokeWidth={strokeWidth}
      mode={mode}
    />
  ) : null;

  if (mode === "svg" || arcRotationDeg === 0) {
    return (
      <>
        {arc}
        {ring}
      </>
    );
  }

  return (
    <>
      <Group rotation={arcRotationDeg} listening={false}>
        {arc}
      </Group>
      {ring}
    </>
  );
}

export function GuardMarkerGlyph(props: Props) {
  const label = props.label ?? "1";

  if (props.mode === "svg") {
    const size = props.size ?? 30;
    return (
      <svg
        viewBox={MENU_VIEWBOX}
        width={size}
        height={size}
        aria-hidden="true"
        className="fc-guard-marker-svg"
        style={{ display: "block", margin: "auto" }}
        overflow="hidden"
      >
        <g transform={`scale(${GUARD_MENU_GLYPH_SCALE})`}>
          <GuardGlyphArt
            mode="svg"
            label={label}
            labelFontSize={MENU_LABEL_SIZE}
            labelBoxWidth={9 * GUARD_RING_TO_GLYPH_RATIO}
            labelBoxHeight={9 * GUARD_RING_TO_GLYPH_RATIO}
            strokeWidth={GUARD_MENU_STROKE}
            part="full"
          />
        </g>
      </svg>
    );
  }

  const {
    circleRadius,
    labelFontSize,
    labelBoxWidth,
    labelBoxHeight,
    arcRotationDeg = 0,
    strokeVariant = "court",
    part = "full",
  } = props;

  const scale = guardGlyphScale(circleRadius);
  const stroke =
    strokeVariant === "frame"
      ? guardFrameStrokeWidth(circleRadius)
      : guardRingStrokeWidth(circleRadius, false);

  return (
    <Group scaleX={scale} scaleY={scale} listening={false}>
      <GuardGlyphArt
        mode="konva"
        label={label}
        labelFontSize={(labelFontSize / scale) * GUARD_RING_TO_GLYPH_RATIO}
        labelBoxWidth={(labelBoxWidth / scale) * GUARD_RING_TO_GLYPH_RATIO}
        labelBoxHeight={(labelBoxHeight / scale) * GUARD_RING_TO_GLYPH_RATIO}
        strokeWidth={stroke / scale}
        part={part}
        arcRotationDeg={arcRotationDeg}
      />
    </Group>
  );
}
