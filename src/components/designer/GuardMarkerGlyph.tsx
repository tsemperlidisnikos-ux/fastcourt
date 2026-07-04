"use client";



import { Circle, Group, Path, Text } from "react-konva";

import { DEFAULT_APP_FONT_KONVA } from "@/lib/config";

import {

  GUARD_CIRCLE_RADIUS,

  GUARD_CIRCLE_STROKE,

  GUARD_MARKER_COLOR,
  GUARD_MARKER_FILL,
  GUARD_MARKER_LABEL_COLOR,

  GUARD_GLYPH_SIZE_SCALE,
  GUARD_RING_RADIUS,

  GUARD_RING_TO_GLYPH_RATIO,

  GUARD_WING_PATH_D,

  guardGlyphScale,

  guardRingStrokeWidth,

} from "@/lib/designer/defense-marker-style";



interface KonvaProps {

  mode: "konva";

  circleRadius: number;

  label?: string;

  labelFontSize: number;

  labelBoxWidth: number;

  labelBoxHeight: number;

  compact?: boolean;

  compactStrokeWidth?: number;

}



interface SvgProps {

  mode: "svg";

  size?: number;

  label?: string;

}



type Props = KonvaProps | SvgProps;



const MENU_LABEL_SIZE = 8.5 * GUARD_RING_TO_GLYPH_RATIO;



/** Single art layer — identical SVG (menu) and Konva (court). */

export function GuardGlyphArt({

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



  if (mode === "svg") {

    return (

      <>

        <path
          d={GUARD_WING_PATH_D}
          fill={GUARD_MARKER_FILL}
          stroke={GUARD_MARKER_COLOR}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle

          r={GUARD_RING_RADIUS}

          fill="none"

          stroke={GUARD_MARKER_COLOR}

          strokeWidth={strokeWidth}

        />

        <text

          x={0}

          y={0.5}

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

      <Path

        data={GUARD_WING_PATH_D}

        fill={GUARD_MARKER_FILL}

        stroke={GUARD_MARKER_COLOR}

        strokeWidth={strokeWidth}

        lineJoin="round"

        lineCap="round"

        strokeScaleEnabled={false}

        listening={false}

      />

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

        x={-labelBoxWidth / 2}

        y={-labelBoxHeight / 2}

        width={labelBoxWidth}

        height={labelBoxHeight}

        listening={false}

      />

    </>

  );

}



export function GuardMarkerGlyph(props: Props) {

  const label = props.label ?? "1";



  if (props.mode === "svg") {

    const size = props.size ?? 32;

    return (

      <svg

        viewBox="-17 -17 34 22"

        width={size}

        height={size}

        aria-hidden="true"

        style={{ display: "block" }}

        overflow="visible"

      >

        <g transform={`scale(${GUARD_GLYPH_SIZE_SCALE})`}>

          <GuardGlyphArt

            mode="svg"

            label={label}

            labelFontSize={MENU_LABEL_SIZE}

            labelBoxWidth={10 * GUARD_RING_TO_GLYPH_RATIO}

            labelBoxHeight={10 * GUARD_RING_TO_GLYPH_RATIO}

            strokeWidth={GUARD_CIRCLE_STROKE}

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

    compact = false,

    compactStrokeWidth,

  } = props;

  const scale = guardGlyphScale(circleRadius);

  const stroke =

    compactStrokeWidth ?? guardRingStrokeWidth(circleRadius, compact);



  return (

    <Group scaleX={scale} scaleY={scale} listening={false}>

      <GuardGlyphArt

        mode="konva"

        label={label}

        labelFontSize={(labelFontSize / scale) * GUARD_RING_TO_GLYPH_RATIO}

        labelBoxWidth={(labelBoxWidth / scale) * GUARD_RING_TO_GLYPH_RATIO}

        labelBoxHeight={(labelBoxHeight / scale) * GUARD_RING_TO_GLYPH_RATIO}

        strokeWidth={stroke / scale}

      />

    </Group>

  );

}

