import type { DesignerTool } from "@/types/designer";

interface Props {
  tool: DesignerTool;
  size?: number;
  className?: string;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Sidebar tool glyphs — SVG for consistent clipboard theme. */
export function DesignerToolIcon({ tool, size = 28, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {tool === "select" && (
        <>
          <path d="M4 6 H8 M4 6 V10" {...STROKE} />
          <path d="M16 6 H12 M16 6 V10" {...STROKE} />
          <path d="M4 14 H8 M4 14 V10" {...STROKE} />
          <path d="M16 14 H12 M16 14 V10" {...STROKE} />
          <path
            d="M11 11 V19 L14 16 L17 20 L14 11 Z"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
      {tool === "offense" && (
        <circle cx="12" cy="12" r="7" {...STROKE} />
      )}
      {tool === "defense" && (
        <>
          <path d="M7 7 L17 17" {...STROKE} />
          <path d="M17 7 L7 17" {...STROKE} />
        </>
      )}
      {tool === "ball" && (
        <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      )}
      {tool === "delete" && (
        <>
          <path d="M5 7 H19" {...STROKE} />
          <path d="M9 7 V5.5 A1.5 1.5 0 0 1 10.5 4 H13.5 A1.5 1.5 0 0 1 15 5.5 V7" {...STROKE} />
          <path d="M8 7 V18 A1 1 0 0 0 9 19 H15 A1 1 0 0 0 16 18 V7" {...STROKE} />
          <path d="M10 10 V16" {...STROKE} />
          <path d="M14 10 V16" {...STROKE} />
        </>
      )}
      {tool === "line" && (
        <path d="M5 19 L19 5" {...STROKE} />
      )}
      {tool === "text" && (
        <path
          fill="currentColor"
          stroke="none"
          d="M6 7.25h12v2.85H13.4v5.65h2.6v2.85H8v-2.85h2.6v-5.65H6V7.25z"
        />
      )}
      {tool === "flag" && (
        <>
          <path d="M6 4 V20" {...STROKE} />
          <path d="M6 4 H14 L12 8 L16 12 H8 V4" fill="currentColor" stroke="none" />
        </>
      )}
      {tool === "shadow" && (
        <>
          <path d="M5 8 H19" {...STROKE} />
          <path d="M5 12 H19" {...STROKE} />
          <path d="M5 16 H19" {...STROKE} />
        </>
      )}
      {tool === "zone" && (
        <>
          <rect x="5" y="5" width="14" height="14" rx="1" {...STROKE} />
          <path d="M5 12 H19" {...STROKE} />
          <path d="M12 5 V19" {...STROKE} />
        </>
      )}
    </svg>
  );
}
