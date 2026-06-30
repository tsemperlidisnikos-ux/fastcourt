type Rgb = { r: number; g: number; b: number };

function parseHexColor(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    return {
      r: Number.parseInt(raw[0] + raw[0], 16),
      g: Number.parseInt(raw[1] + raw[1], 16),
      b: Number.parseInt(raw[2] + raw[2], 16),
    };
  }
  if (raw.length === 6 || raw.length === 8) {
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
    };
  }
  return null;
}

function parseRgbColor(value: string): Rgb | null {
  const match = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!match) return null;
  return {
    r: Math.round(Number(match[1])),
    g: Math.round(Number(match[2])),
    b: Math.round(Number(match[3])),
  };
}

function parseCssColor(color: string): Rgb | null {
  const trimmed = color.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return parseHexColor(trimmed);
  if (trimmed.startsWith("rgb")) return parseRgbColor(trimmed);
  return null;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Pick light or dark label text for a solid background fill. */
export function contrastingTextOnBackground(
  background: string,
  options?: { lightText?: string; darkText?: string; threshold?: number },
): string {
  const lightText = options?.lightText ?? "#ffffff";
  const darkText = options?.darkText ?? "#0f172a";
  const threshold = options?.threshold ?? 0.45;
  const rgb = parseCssColor(background);
  if (!rgb) return lightText;
  return relativeLuminance(rgb) > threshold ? darkText : lightText;
}

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Mix two CSS hex/rgb colors; weight is the proportion of `mix` (0–1). */
export function mixHexColors(base: string, mix: string, weight: number): string {
  const a = parseCssColor(base);
  const b = parseCssColor(mix);
  if (!a || !b) return base;
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex({
    r: a.r * (1 - w) + b.r * w,
    g: a.g * (1 - w) + b.g * w,
    b: a.b * (1 - w) + b.b * w,
  });
}

export function darkenHex(hex: string, amount = 0.12): string {
  return mixHexColors(hex, "#000000", amount);
}

export function resolveHeaderNavActiveTextColor(activeColor: string): string {
  return contrastingTextOnBackground(activeColor);
}
