export type FieldTagColors = Record<string, string>;

export const TAG_COLOR_PALETTE = [
  { id: "slate", label: "Slate", value: "#1f2937" },
  { id: "blue", label: "Blue", value: "#2563eb" },
  { id: "red", label: "Red", value: "#9e1b32" },
  { id: "green", label: "Green", value: "#16a34a" },
  { id: "amber", label: "Amber", value: "#d97706" },
  { id: "purple", label: "Purple", value: "#7c3aed" },
  { id: "teal", label: "Teal", value: "#0d9488" },
  { id: "rose", label: "Rose", value: "#e11d48" },
] as const;

export const DEFAULT_TAG_COLOR = TAG_COLOR_PALETTE[0].value;

export function tagColorKey(name: string) {
  return name.trim().toLowerCase();
}

export function normalizeFieldTagColors(raw: unknown): FieldTagColors {
  if (!raw || typeof raw !== "object") return {};
  const out: FieldTagColors = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedKey = tagColorKey(key);
    if (!normalizedKey || typeof value !== "string" || !value.trim()) continue;
    out[normalizedKey] = value.trim();
  }
  return out;
}

export function resolveTagColor(name: string, colors: FieldTagColors) {
  return colors[tagColorKey(name)] ?? DEFAULT_TAG_COLOR;
}

export function defaultTagColorForIndex(index: number) {
  return TAG_COLOR_PALETTE[index % TAG_COLOR_PALETTE.length]?.value ?? DEFAULT_TAG_COLOR;
}

export function renameTagColorKey(
  colors: FieldTagColors,
  oldName: string,
  newName: string,
): FieldTagColors {
  const oldKey = tagColorKey(oldName);
  const newKey = tagColorKey(newName);
  if (!oldKey || !newKey || oldKey === newKey) return colors;
  if (!(oldKey in colors)) return colors;
  const next = { ...colors };
  next[newKey] = next[oldKey];
  delete next[oldKey];
  return next;
}

export function removeTagColorKeys(
  colors: FieldTagColors,
  names: string[],
): FieldTagColors {
  const next = { ...colors };
  for (const name of names) {
    delete next[tagColorKey(name)];
  }
  return next;
}
