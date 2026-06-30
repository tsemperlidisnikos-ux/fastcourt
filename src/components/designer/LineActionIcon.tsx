import type { ActionType } from "@/types/designer";

interface Props {
  type: ActionType;
  color?: string;
  className?: string;
}

const HY = 12;

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

/** Hoops Geek toolbar: horizontal left → right action glyphs. */
export function LineActionIcon({ type, color = "currentColor", className }: Props) {
  const stroke = color;
  const w = 1.85;
  const cap = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

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
          <path d="M 4 12 H 22" stroke={stroke} strokeWidth={w} {...cap} />
          <ArrowHead x={26} y={HY} dx={1} dy={0} color={stroke} />
        </>
      )}

      {type === "pass" && (
        <>
          <path
            d="M 4 12 H 21"
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray="3.5 3"
            {...cap}
          />
          <ArrowHead x={26} y={HY} dx={1} dy={0} color={stroke} />
        </>
      )}

      {type === "dribble" && (
        <>
          <polyline
            points="3,12 6,8 9,12 12,8 15,12 18,8 21,12 24,8 27,12 30,12"
            stroke={stroke}
            strokeWidth={w}
            fill="none"
            {...cap}
          />
          <ArrowHead x={30} y={HY} dx={1} dy={0} color={stroke} />
        </>
      )}

      {type === "screen" && (
        <>
          <path d="M 4 12 H 18" stroke={stroke} strokeWidth={w} {...cap} />
          <path d="M 18 8 V 16" stroke={stroke} strokeWidth={w} {...cap} />
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
        <>
          <path d="M 4 12 H 30" stroke={stroke} strokeWidth={w} {...cap} />
          <path d="M 20 8 V 16" stroke={stroke} strokeWidth={w} {...cap} />
          <path d="M 24 8 V 16" stroke={stroke} strokeWidth={w} {...cap} />
        </>
      )}

      {type === "shoot" && (
        <>
          <path
            d="M 4 12 H 20"
            stroke={stroke}
            strokeWidth={w}
            strokeDasharray="3 2.5"
            {...cap}
          />
          <circle
            cx={26}
            cy={HY}
            r={3}
            stroke={stroke}
            strokeWidth={w}
            fill="none"
          />
          <path d="M 26 9 V 15" stroke={stroke} strokeWidth={1.2} {...cap} />
          <path d="M 23 12 H 29" stroke={stroke} strokeWidth={1.2} {...cap} />
        </>
      )}
    </svg>
  );
}
