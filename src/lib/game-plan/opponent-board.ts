import {
  suggestPlaysForGamePlanCategory,
  type GamePlanPlaySuggestion,
} from "@/lib/game-plan/suggest-plays";
import type {
  GamePlanCategoryId,
  OpponentTendency,
  OpponentTendencyKind,
} from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import { filmScoutNoteFromSession } from "@/lib/film-room/film-game-plan-link";

export const OPPONENT_TENDENCY_PRESETS: ReadonlyArray<{
  kind: OpponentTendencyKind;
  label: string;
}> = [
  { kind: "zone", label: "Zone offense" },
  { kind: "press", label: "Full-court press" },
  { kind: "blob", label: "Baseline OB (BLOB)" },
  { kind: "slob", label: "Sideline OB (SLOB)" },
  { kind: "ato", label: "After timeout (ATO)" },
  { kind: "transition", label: "Transition attack" },
  { kind: "halfcourt", label: "Half-court sets" },
];

const TENDENCY_DEFENSE_CATEGORIES: Record<
  OpponentTendencyKind,
  readonly GamePlanCategoryId[]
> = {
  zone: ["zone", "defense"],
  press: ["press", "defense"],
  blob: ["defense", "blob"],
  slob: ["defense", "slob"],
  ato: ["defense", "ato"],
  transition: ["defense", "transition"],
  halfcourt: ["defense", "halfcourt"],
  other: ["defense"],
};

export function newOpponentTendencyId() {
  return `obt_${crypto.randomUUID()}`;
}

export function defaultTendencyLabel(kind: OpponentTendencyKind) {
  return (
    OPPONENT_TENDENCY_PRESETS.find((row) => row.kind === kind)?.label ??
    "Other tendency"
  );
}

export function createOpponentTendency(
  kind: OpponentTendencyKind,
  label?: string,
  notes?: string,
  film?: { filmSessionId?: string; filmTimestamp?: number },
): OpponentTendency {
  const now = new Date().toISOString();
  const filmTimestamp =
    film?.filmTimestamp != null &&
    Number.isFinite(film.filmTimestamp) &&
    film.filmTimestamp >= 0
      ? film.filmTimestamp
      : undefined;
  return {
    id: newOpponentTendencyId(),
    kind,
    label: label?.trim() || defaultTendencyLabel(kind),
    notes: notes?.trim() || undefined,
    filmSessionId: film?.filmSessionId?.trim() || undefined,
    filmTimestamp,
    createdAt: now,
  };
}

export function createFilmLinkedTendency(
  kind: OpponentTendencyKind,
  filmSessionId: string,
  sessionTitle: string,
  filmTimestamp: number,
  extraNotes?: string,
): OpponentTendency {
  return createOpponentTendency(
    kind,
    undefined,
    filmScoutNoteFromSession(sessionTitle, filmTimestamp, extraNotes),
    { filmSessionId, filmTimestamp },
  );
}

export function appendOpponentTendency(
  board: OpponentTendency[] | undefined,
  tendency: OpponentTendency,
): OpponentTendency[] {
  return [...(board ?? []), tendency];
}

export function normalizeOpponentTendencies(
  raw: OpponentTendency[] | undefined,
): OpponentTendency[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      id: row.id?.trim() || newOpponentTendencyId(),
      kind: row.kind || "other",
      label: row.label?.trim() || defaultTendencyLabel(row.kind || "other"),
      notes: row.notes?.trim() || undefined,
      filmSessionId: row.filmSessionId?.trim() || undefined,
      filmTimestamp:
        typeof row.filmTimestamp === "number" &&
        Number.isFinite(row.filmTimestamp) &&
        row.filmTimestamp >= 0
          ? row.filmTimestamp
          : undefined,
      createdAt: row.createdAt || new Date().toISOString(),
    }))
    .filter((row) => row.label.length > 0);
}

/** Suggest our defensive answers from library tags/titles. */
export function suggestDefenseForTendency(
  plays: StoredPlay[],
  tendency: OpponentTendency,
  excludedPlayIds: ReadonlySet<string>,
  limit = 6,
): GamePlanPlaySuggestion[] {
  const categories = TENDENCY_DEFENSE_CATEGORIES[tendency.kind] ?? ["defense"];
  const merged = new Map<string, GamePlanPlaySuggestion>();

  for (const categoryId of categories) {
    const batch = suggestPlaysForGamePlanCategory(
      plays,
      categoryId,
      excludedPlayIds,
      limit,
    );
    for (const row of batch) {
      const existing = merged.get(row.play.id);
      if (!existing || row.score > existing.score) {
        merged.set(row.play.id, row);
      } else if (existing && row.score === existing.score) {
        merged.set(row.play.id, {
          ...existing,
          reasons: [...new Set([...existing.reasons, ...row.reasons])],
        });
      }
    }
  }

  const labelToken = tendency.label.trim().toLowerCase();
  if (labelToken.length > 2) {
    for (const play of plays) {
      if (excludedPlayIds.has(play.id)) continue;
      const haystack = [
        play.title,
        play.series,
        ...(play.tags || []),
        play.playNotes,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(labelToken)) continue;
      const existing = merged.get(play.id);
      const bonus = {
        play,
        score: (existing?.score ?? 0) + 5,
        reasons: [...new Set([...(existing?.reasons ?? []), "label match"])],
      };
      merged.set(play.id, bonus);
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.play.title.localeCompare(b.play.title);
    })
    .slice(0, limit);
}

export function opponentTendencyKindLabel(kind: OpponentTendencyKind) {
  return defaultTendencyLabel(kind);
}

export function opponentTendencySignature(row: OpponentTendency) {
  return `${row.kind}|${row.label.trim().toLowerCase()}`;
}

/** Fresh ids for rematch / import (does not mutate source rows). */
export function cloneOpponentBoard(
  board: OpponentTendency[] | undefined,
): OpponentTendency[] {
  const now = new Date().toISOString();
  return normalizeOpponentTendencies(
    (board ?? []).map((row) => ({
      ...row,
      id: newOpponentTendencyId(),
      createdAt: now,
    })),
  );
}

/** Append tendencies from another plan, skipping duplicate kind+label pairs. */
export function mergeOpponentBoards(
  existing: OpponentTendency[] | undefined,
  incoming: OpponentTendency[] | undefined,
): OpponentTendency[] {
  const merged = [...(existing ?? [])];
  const seen = new Set(merged.map(opponentTendencySignature));
  for (const row of cloneOpponentBoard(incoming)) {
    const signature = opponentTendencySignature(row);
    if (seen.has(signature)) continue;
    seen.add(signature);
    merged.push(row);
  }
  return merged;
}

export function mergeScoutingNotes(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const current = existing?.trim();
  const next = incoming?.trim();
  if (!next) return current || undefined;
  if (!current) return next;
  if (current.includes(next)) return current;
  return `${current}\n\n---\n\n${next}`;
}
