import type { ActionType } from "@/types/designer";

interface Props {
  type: ActionType;
  color?: string;
  className?: string;
}

/** Bottom-left → top-right guide (photo 2 style). */
const X1 = 6;
const Y1 = 18;
const X2 = 25;
const Y2 = 7;

function ArrowHead({
  x,
  y,
  dx,
  dy,
  color,
  size = 4,
  spread = 2.4,
}: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size?: number;
  spread?: number;
}) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tip = `${x},${y}`;
  const a = `${x - ux * size + px * spread},${y - uy * size + py * spread}`;
  const b = `${x - ux * size - px * spread},${y - uy * size - py * spread}`;
  return <polygon points={`${tip} ${a} ${b}`} fill={color} />;
}

export function LineActionIcon({ type, color = "currentColor", className }: Props) {
  const stroke = color;
  const w = 1.85;
  const cap = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const endDx = X2 - X1;
  const endDy = Y2 - Y1;

  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {type === "cut" && (
        <>
          <path
            d={`M ${X1} ${Y1} L ${X2} ${Y2}`}
            stroke={stroke}
            strokeWidth={w}
            {...cap}
          />
          <ArrowHead x={X2} y={Y2} dx={endDx} dy={endDy} color={stroke} />
        </>
      )}

      {type === "pass" && (
        <>
          <path
            d={`M ${X1} ${Y1} L ${X2 - 1.5} ${Y2 + 0.8}`}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray="3.5 3"
            {...cap}
          />
          <ArrowHead x={X2} y={Y2} dx={endDx} dy={endDy} color={stroke} />
        </>
      )}

      {type === "dribble" && (
        <>
          <path
            d="M 3 12 C 6 6 9 6 12 12 C 15 18 18 18 21 12 C 24 6 27 6 29 12"
            stroke={stroke}
            strokeWidth={w}
            fill="none"
            {...cap}
          />
          <ArrowHead x={29} y={12} dx={1} dy={0} color={stroke} />
        </>
      )}

      {type === "screen" && (
        <>
          <path d="M 4 12 H21" stroke={stroke} strokeWidth={w} {...cap} />
          <path d="M 21 7 V17" stroke={stroke} strokeWidth={w} {...cap} />
        </>
      )}

      {type === "curl" && (
        <>
          <path
            d="M 7 18 C 7 9.5 14.5 7.5 21.5 9.5 C 26 11 26.5 15 22.5 17.2"
            stroke={stroke}
            strokeWidth={w}
            fill="none"
            {...cap}
          />
          <ArrowHead x={22.5} y={17.2} dx={-4} dy={2} color={stroke} />
        </>
      )}

      {type === "handoff" && (
        <g transform="translate(16 14.5) scale(1.2) translate(-16 -12)">
          <path d="M 3 12 H 29" stroke={stroke} strokeWidth={w} {...cap} />
          <path d="M 12 7 V 17" stroke={stroke} strokeWidth={w} {...cap} />
          <path d="M 20 7 V 17" stroke={stroke} strokeWidth={w} {...cap} />
        </g>
      )}

      {type === "shoot" && (
        <>
          <path
            d={`M ${X1} ${Y1} L ${X2 - 3} ${Y2 + 1}`}
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray="3 2.5"
            {...cap}
          />
          <circle
            cx={X2 + 0.5}
            cy={Y2 + 0.5}
            r={2.8}
            stroke={stroke}
            strokeWidth={w}
            fill="none"
          />
        </>
      )}
    </svg>
  );
}
