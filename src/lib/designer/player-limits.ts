import type { DesignerObject, ObjectKind } from "@/types/designer";

export const MAX_PLAY_OFFENSE_PLAYERS = 5;
export const MAX_PLAY_DEFENSE_PLAYERS = 5;
export const MAX_PLAY_BALL_MARKERS = 1;
export const MAX_DRILL_OFFENSE_PLAYERS = 20;
export const MAX_DRILL_DEFENSE_PLAYERS = 20;
export const MAX_DRILL_BALL_MARKERS = 20;

/** @deprecated use MAX_PLAY_OFFENSE_PLAYERS */
export const MAX_OFFENSE_PLAYERS = MAX_PLAY_OFFENSE_PLAYERS;
/** @deprecated use MAX_PLAY_DEFENSE_PLAYERS */
export const MAX_DEFENSE_PLAYERS = MAX_PLAY_DEFENSE_PLAYERS;

export type DesignerRosterMode = "play" | "drill";

export function rosterModeFromLibraryType(
  type: string | undefined,
): DesignerRosterMode {
  return type === "drill" ? "drill" : "play";
}

export function isRosterKind(kind: ObjectKind) {
  return kind === "offense" || kind === "defense";
}

export function rosterLimit(
  kind: "offense" | "defense",
  mode: DesignerRosterMode = "play",
) {
  if (mode === "drill") {
    return kind === "offense"
      ? MAX_DRILL_OFFENSE_PLAYERS
      : MAX_DRILL_DEFENSE_PLAYERS;
  }
  return kind === "offense"
    ? MAX_PLAY_OFFENSE_PLAYERS
    : MAX_PLAY_DEFENSE_PLAYERS;
}

export function ballLimit(mode: DesignerRosterMode = "play") {
  return mode === "drill" ? MAX_DRILL_BALL_MARKERS : MAX_PLAY_BALL_MARKERS;
}

export function countRoster(
  objects: DesignerObject[],
  kind: "offense" | "defense",
) {
  return objects.filter((o) => o.kind === kind).length;
}

export function countBallObjects(objects: DesignerObject[]) {
  return objects.filter((o) => o.kind === "ball").length;
}

export function countOffenseBallRings(objects: DesignerObject[]) {
  return objects.filter((o) => o.kind === "offense" && o.hasBall).length;
}

/** Standalone balls + offense ball rings (possession indicators). */
export function countBallMarkers(
  objects: DesignerObject[],
  mode: DesignerRosterMode = "play",
) {
  if (mode === "drill") {
    return countBallObjects(objects) + countOffenseBallRings(objects);
  }
  return Math.min(
    1,
    countBallObjects(objects) + countOffenseBallRings(objects),
  );
}

/** Strip optional X prefix — defense labels stored as 1–5 (or X). */
export function normalizeDefenseLabel(raw: string): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/^x$/i.test(t)) return "X";
  const m = t.match(/^x?\s*(\d+)$/i);
  if (m) return m[1];
  return t.slice(0, 2);
}

export function normalizeOffenseLabel(raw: string): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(\d+)/);
  if (m) return m[1];
  return t.slice(0, 2);
}

export function normalizeRosterLabel(
  kind: "offense" | "defense",
  raw: string,
): string | null {
  if (kind === "defense") return normalizeDefenseLabel(raw);
  return normalizeOffenseLabel(raw);
}

/** Court display: X1, X2, … or lone X. */
export function formatDefenseDisplayLabel(label: string | undefined): string {
  const trimmed = label?.trim() ?? "";
  if (!trimmed) return "";
  if (/^x$/i.test(trimmed)) return "X";
  const digit = normalizeDefenseLabel(trimmed);
  if (digit && /^\d+$/.test(digit)) return `X${digit}`;
  return `X${trimmed}`;
}

function rosterJerseySlot(
  kind: "offense" | "defense",
  label: string,
  mode: DesignerRosterMode,
): string | null {
  const normalized = normalizeRosterLabel(kind, label);
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  if (n < 1 || n > rosterLimit(kind, mode)) return null;
  return String(n);
}

export function nextAvailableJersey(
  objects: DesignerObject[],
  kind: "offense" | "defense",
  mode: DesignerRosterMode = "play",
): string | null {
  const used = new Set(
    objects
      .filter((o) => o.kind === kind)
      .map((o) => rosterJerseySlot(kind, o.label ?? "", mode))
      .filter((slot): slot is string => slot != null),
  );

  for (let n = 1; n <= rosterLimit(kind, mode); n++) {
    const label = String(n);
    if (!used.has(label)) return label;
  }
  return null;
}

export function canPlaceRosterPlayer(
  objects: DesignerObject[],
  kind: ObjectKind,
  mode: DesignerRosterMode = "play",
): boolean {
  if (!isRosterKind(kind)) return true;
  return (
    countRoster(objects, kind) < rosterLimit(kind, mode) &&
    nextAvailableJersey(objects, kind, mode) != null
  );
}

export function canPlaceBall(
  objects: DesignerObject[],
  mode: DesignerRosterMode = "play",
): boolean {
  return countBallMarkers(objects, mode) < ballLimit(mode);
}

/** Ensure offense/defense labels are unique digits (legacy X-only defense → 1–N). */
export function reconcileRosterLabels(
  objects: DesignerObject[],
  mode: DesignerRosterMode = "play",
): DesignerObject[] {
  const usedOffense = new Set<string>();
  const usedDefense = new Set<string>();

  return objects.map((o) => {
    if (o.kind !== "offense" && o.kind !== "defense") return o;

    const kind = o.kind;
    const used = kind === "offense" ? usedOffense : usedDefense;
    const normalized = normalizeRosterLabel(kind, o.label ?? "");
    let label: string | null = null;

    if (normalized && /^\d+$/.test(normalized) && !used.has(normalized)) {
      label = normalized;
    }

    if (!label) {
      for (let n = 1; n <= rosterLimit(kind, mode); n++) {
        const candidate = String(n);
        if (!used.has(candidate)) {
          label = candidate;
          break;
        }
      }
    }

    if (label) used.add(label);
    return label && label !== o.label ? { ...o, label } : o;
  });
}
