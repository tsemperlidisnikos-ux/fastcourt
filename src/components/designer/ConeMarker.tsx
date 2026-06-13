"use client";

import { Ellipse, Group, Line, Rect } from "react-konva";

const CONE_W = 30;
const CONE_H = 44;

function coneWidthAt(t: number, tipW: number, baseW: number) {
  return tipW + (baseW - tipW) * t;
}

function ConeStripe({
  bodyTop,
  bodyH,
  tipW,
  baseW,
  t0,
  t1,
  fill,
}: {
  bodyTop: number;
  bodyH: number;
  tipW: number;
  baseW: number;
  t0: number;
  t1: number;
  fill: string;
}) {
  const yTop = bodyTop + bodyH * t0;
  const yBot = bodyTop + bodyH * t1;
  const wTop = coneWidthAt(t0, tipW, baseW);
  const wBot = coneWidthAt(t1, tipW, baseW);
  return (
    <Line
      points={[-wTop / 2, yTop, wTop / 2, yTop, wBot / 2, yBot, -wBot / 2, yBot]}
      closed
      fill={fill}
      stroke={fill === "#ffffff" ? "#e2e8f0" : undefined}
      strokeWidth={fill === "#ffffff" ? 0.4 : 0}
      listening={false}
    />
  );
}

export function ConeMarker({ scale = 1 }: { scale?: number }) {
  const baseH = 7;
  const baseW = CONE_W;
  const tipW = 2;
  const bodyTop = -CONE_H / 2 + 3;
  const bodyBottom = CONE_H / 2 - baseH;
  const bodyH = bodyBottom - bodyTop;

  return (
    <Group scaleX={scale} scaleY={scale} listening={false}>
      <Ellipse
        x={0}
        y={CONE_H / 2 + 1}
        radiusX={baseW / 2 + 1}
        radiusY={2.5}
        fill="rgba(15, 23, 42, 0.14)"
        listening={false}
      />
      <Rect
        x={-baseW / 2}
        y={bodyBottom}
        width={baseW}
        height={baseH}
        fill="#ea580c"
        stroke="#9a3412"
        strokeWidth={0.8}
        cornerRadius={1}
        listening={false}
      />
      <Line
        points={[-baseW / 2 + 1, bodyBottom + 0.5, baseW / 2 - 1, bodyBottom + 0.5]}
        stroke="#fb923c"
        strokeWidth={1}
        opacity={0.85}
        listening={false}
      />
      <Group listening={false}>
        <ConeStripe bodyTop={bodyTop} bodyH={bodyH} tipW={tipW} baseW={baseW - 3} t0={0} t1={0.16} fill="#ff6d00" />
        <ConeStripe bodyTop={bodyTop} bodyH={bodyH} tipW={tipW} baseW={baseW - 3} t0={0.16} t1={0.3} fill="#ffffff" />
        <ConeStripe bodyTop={bodyTop} bodyH={bodyH} tipW={tipW} baseW={baseW - 3} t0={0.3} t1={0.46} fill="#ff6d00" />
        <ConeStripe bodyTop={bodyTop} bodyH={bodyH} tipW={tipW} baseW={baseW - 3} t0={0.46} t1={0.62} fill="#ffffff" />
        <ConeStripe bodyTop={bodyTop} bodyH={bodyH} tipW={tipW} baseW={baseW - 3} t0={0.62} t1={1} fill="#ff6d00" />
      </Group>
      <Line
        points={[0, bodyTop, -coneWidthAt(0.55, tipW, baseW - 3) / 2 + 1, bodyTop + bodyH * 0.55]}
        stroke="rgba(255,255,255,0.42)"
        strokeWidth={2.2}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[
          0, bodyTop,
          baseW / 2 - 2.5, bodyBottom,
          baseW / 2, bodyBottom + baseH,
          -baseW / 2, bodyBottom + baseH,
          -baseW / 2 + 2.5, bodyBottom,
          0, bodyTop,
        ]}
        closed
        stroke="rgba(154,52,18,0.55)"
        strokeWidth={0.9}
        fill="transparent"
        listening={false}
      />
    </Group>
  );
}

function coneStripePoints(
  bodyTop: number,
  bodyH: number,
  tipW: number,
  baseW: number,
  t0: number,
  t1: number,
) {
  const yTop = bodyTop + bodyH * t0;
  const yBot = bodyTop + bodyH * t1;
  const wTop = coneWidthAt(t0, tipW, baseW);
  const wBot = coneWidthAt(t1, tipW, baseW);
  return `${-wTop / 2},${yTop} ${wTop / 2},${yTop} ${wBot / 2},${yBot} ${-wBot / 2},${yBot}`;
}

const CONE_STRIPES: Array<{ t0: number; t1: number; fill: string }> = [
  { t0: 0, t1: 0.16, fill: "#ff6d00" },
  { t0: 0.16, t1: 0.3, fill: "#ffffff" },
  { t0: 0.3, t1: 0.46, fill: "#ff6d00" },
  { t0: 0.46, t1: 0.62, fill: "#ffffff" },
  { t0: 0.62, t1: 1, fill: "#ff6d00" },
];

/** Toolbar icon — must be SVG; Konva nodes only work inside Stage/Layer. */
export function ConeToolIcon({ size = 22 }: { size?: number }) {
  const baseH = 7;
  const baseW = CONE_W;
  const tipW = 2;
  const bodyTop = -CONE_H / 2 + 3;
  const bodyBottom = CONE_H / 2 - baseH;
  const bodyH = bodyBottom - bodyTop;
  const stripeW = baseW - 3;

  return (
    <span className="cone-tool-icon" aria-hidden="true">
      <svg
        viewBox={`${-CONE_W / 2 - 2} ${-CONE_H / 2 - 1} ${CONE_W + 4} ${CONE_H + 4}`}
        width={size}
        height={size}
        role="img"
        focusable="false"
      >
        <ellipse
          cx={0}
          cy={CONE_H / 2 + 1}
          rx={baseW / 2 + 1}
          ry={2.5}
          fill="rgba(15, 23, 42, 0.14)"
        />
        <rect
          x={-baseW / 2}
          y={bodyBottom}
          width={baseW}
          height={baseH}
          rx={1}
          fill="#ea580c"
          stroke="#9a3412"
          strokeWidth={0.8}
        />
        <line
          x1={-baseW / 2 + 1}
          y1={bodyBottom + 0.5}
          x2={baseW / 2 - 1}
          y2={bodyBottom + 0.5}
          stroke="#fb923c"
          strokeWidth={1}
          opacity={0.85}
        />
        {CONE_STRIPES.map((stripe) => (
          <polygon
            key={`${stripe.t0}-${stripe.t1}`}
            points={coneStripePoints(
              bodyTop,
              bodyH,
              tipW,
              stripeW,
              stripe.t0,
              stripe.t1,
            )}
            fill={stripe.fill}
            stroke={stripe.fill === "#ffffff" ? "#e2e8f0" : undefined}
            strokeWidth={stripe.fill === "#ffffff" ? 0.4 : 0}
          />
        ))}
        <line
          x1={0}
          y1={bodyTop}
          x2={-coneWidthAt(0.55, tipW, stripeW) / 2 + 1}
          y2={bodyTop + bodyH * 0.55}
          stroke="rgba(255,255,255,0.42)"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <polygon
          points={`0,${bodyTop} ${baseW / 2 - 2.5},${bodyBottom} ${baseW / 2},${bodyBottom + baseH} ${-baseW / 2},${bodyBottom + baseH} ${-baseW / 2 + 2.5},${bodyBottom}`}
          fill="transparent"
          stroke="rgba(154,52,18,0.55)"
          strokeWidth={0.9}
        />
      </svg>
    </span>
  );
}
