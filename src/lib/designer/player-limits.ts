import type { DesignerObject, ObjectKind } from "@/types/designer";

export const MAX_OFFENSE_PLAYERS = 5;
export const MAX_DEFENSE_PLAYERS = 5;

const PLAYER_KINDS = new Set<ObjectKind>(["offense", "defense"]);

export function isRosterKind(kind: ObjectKind) {
  return kind === "offense" || kind === "defense";
}

export function rosterLimit(kind: "offense" | "defense") {
  return kind === "offense" ? MAX_OFFENSE_PLAYERS : MAX_DEFENSE_PLAYERS;
}

export function countRoster(objects: DesignerObject[], kind: "offense" | "defense") {
  return objects.filter((o) => o.kind === kind).length;
}

export function nextAvailableJersey(
  objects: DesignerObject[],
  kind: "offense" | "defense",
): string | null {
  const used = new Set(
    objects
      .filter((o) => o.kind === kind)
      .map((o) => o.label?.trim())
      .filter((label): label is string => Boolean(label)),
  );

  for (let n = 1; n <= rosterLimit(kind); n++) {
    const label = String(n);
    if (!used.has(label)) return label;
  }
  return null;
}

export function canPlaceRosterPlayer(
  objects: DesignerObject[],
  kind: ObjectKind,
): boolean {
  if (!isRosterKind(kind)) return true;
  return countRoster(objects, kind) < rosterLimit(kind) && nextAvailableJersey(objects, kind) != null;
}
