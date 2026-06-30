/** Hoops Geek wood court uses vertical plank stripes on the default wood preset. */
export const HG_WOOD_PLANK_WIDTH_FT = 2.5;

/** Target repeat size (px) for wood texture tiling on the court floor. */
export const COURT_WOOD_PATTERN_REPEAT_PX = 420;

export function woodFloorPatternScale(textureWidth: number, floorSpanPx: number) {
  const targetRepeat = Math.max(
    220,
    Math.min(COURT_WOOD_PATTERN_REPEAT_PX, floorSpanPx / 3.5),
  );
  return targetRepeat / textureWidth;
}

export interface WoodTileRect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

function parseRgb(color: string): [number, number, number] | null {
  const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return null;
}

function shadeRgb(color: string, delta: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  return `rgb(${clamp(rgb[0] + delta)}, ${clamp(rgb[1] + delta)}, ${clamp(rgb[2] + delta)})`;
}

/**
 * Vertical wood planks for HG-style floor (alternating ±8 on RGB channels).
 */
export function buildWoodTileRects(
  courtX: number,
  courtY: number,
  courtW: number,
  courtH: number,
  widthFt: number,
  baseColor: string,
): WoodTileRect[] {
  const plankCount = Math.max(1, Math.ceil(widthFt / HG_WOOD_PLANK_WIDTH_FT));
  const plankW = courtW / plankCount;
  const altColor = shadeRgb(baseColor, -14);
  const rects: WoodTileRect[] = [];

  for (let i = 0; i < plankCount; i++) {
    rects.push({
      x: courtX + i * plankW,
      y: courtY,
      width: plankW + 0.5,
      height: courtH,
      fill: i % 2 === 0 ? baseColor : altColor,
    });
  }

  return rects;
}
