import type { FilmRoomMarkupIconVariant } from "@/lib/film-room/markup-toolbar-presets";

interface Props {
  variant: FilmRoomMarkupIconVariant;
  accent?: string;
}

/** Rounded marker glyph — same silhouette for every ink color. */
export function FilmRoomMarkupToolIcon({ variant, accent = "#34c759" }: Props) {
  if (variant === "eraser") {
    return (
      <svg viewBox="0 0 28 56" className="fc-film-markup-glyph" aria-hidden="true">
        <rect x="9" y="22" width="10" height="30" rx="2" fill="#2c2c2e" />
        <rect x="7" y="6" width="14" height="18" rx="4" fill="#ff8a9b" />
        <rect x="8" y="7" width="12" height="6" rx="3" fill="#ffb3be" opacity="0.65" />
        <path d="M7 24 H21" stroke="#1c1c1e" strokeWidth="1.2" />
      </svg>
    );
  }

  const gradientId = `marker-body-${accent.replace("#", "")}`;
  const light = isLightAccent(accent);

  return (
    <svg viewBox="0 0 30 54" className="fc-film-markup-glyph" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          {light ? (
            <>
              <stop offset="0%" stopColor="#d8d8dc" />
              <stop offset="50%" stopColor="#f5f5f7" />
              <stop offset="100%" stopColor="#ffffff" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor={shade(accent, -0.22)} />
              <stop offset="50%" stopColor={accent} />
              <stop offset="100%" stopColor={shade(accent, 0.14)} />
            </>
          )}
        </linearGradient>
      </defs>
      <path
        d="M9 8 H21 C23 8 24 10 23.5 14 L20 48 C19.5 51 17.5 52 15 52 C12.5 52 10.5 51 10 48 L6.5 14 C6 10 7 8 9 8 Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M12 52 H18 C17.2 54 12.8 54 12 52 Z"
        fill={light ? "#b0b0b5" : shade(accent, -0.35)}
      />
      {!light ? (
        <ellipse cx="15" cy="11" rx="5.5" ry="1.8" fill="rgba(255,255,255,0.2)" />
      ) : null}
    </svg>
  );
}

function isLightAccent(hex: string): boolean {
  const raw = hex.replace("#", "");
  const value = parseInt(raw.length === 3 ? raw.replace(/./g, "$&$&") : raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.78;
}

function shade(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  const num = parseInt(raw.length === 3 ? raw.replace(/./g, "$&$&") : raw, 16);
  const r = clamp(((num >> 16) & 255) * (1 + amount));
  const g = clamp(((num >> 8) & 255) * (1 + amount));
  const b = clamp((num & 255) * (1 + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
