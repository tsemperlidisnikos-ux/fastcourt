import type {
  FilmClipCoachingCategoryId,
  FilmClipCoachingRecommendations,
  FilmClipCoachingSuggestion,
} from "@/lib/film-room/film-clip-analyze-types";
import { formatFilmTimestamp } from "@/lib/film-room/film-game-plan-link";
import { formatCounterForNotes } from "@/lib/film-room/film-counter-playbook";

export const COACHING_CATEGORY_LABELS: Record<
  FilmClipCoachingCategoryId,
  string
> = {
  alternativeOptions: "Alternative options",
  counters: "Counters — beat their look",
  defensiveAdjustments: "Defensive adjustments",
  spacingFixes: "Spacing fixes",
  timingCorrections: "Timing corrections",
};

export const COACHING_CATEGORY_ORDER: FilmClipCoachingCategoryId[] = [
  "alternativeOptions",
  "counters",
  "defensiveAdjustments",
  "spacingFixes",
  "timingCorrections",
];

export function emptyCoachingRecommendations(): FilmClipCoachingRecommendations {
  return {
    alternativeOptions: [],
    counters: [],
    defensiveAdjustments: [],
    spacingFixes: [],
    timingCorrections: [],
  };
}

export function coachingHasSuggestions(
  coaching: FilmClipCoachingRecommendations,
): boolean {
  return COACHING_CATEGORY_ORDER.some(
    (key) => coaching[key].length > 0,
  );
}

export function formatCoachingForScoutingNotes(
  coaching: FilmClipCoachingRecommendations,
  sessionTitle: string,
  timestamp: number,
): string {
  const lines: string[] = [];
  const timeLabel = formatFilmTimestamp(timestamp);
  const header = [`AI Coaching`, sessionTitle.trim(), timeLabel]
    .filter(Boolean)
    .join(" @ ");
  lines.push(header);

  for (const categoryId of COACHING_CATEGORY_ORDER) {
    const items = coaching[categoryId];
    if (!items.length) continue;
    lines.push(`${COACHING_CATEGORY_LABELS[categoryId]}:`);
    if (categoryId === "counters") {
      for (const item of coaching.counters) {
        lines.push(formatCounterForNotes(item));
      }
      continue;
    }
    for (const item of items) {
      lines.push(`• ${item.title} — ${item.detail}`);
    }
  }

  return lines.join("\n").trim();
}

export function mergeCoachingIntoScoutingNotes(
  existing: string | undefined,
  coaching: FilmClipCoachingRecommendations,
  sessionTitle: string,
  timestamp: number,
): string {
  if (!coachingHasSuggestions(coaching)) {
    return existing?.trim() ?? "";
  }
  const block = formatCoachingForScoutingNotes(
    coaching,
    sessionTitle,
    timestamp,
  );
  const prior = existing?.trim();
  if (!prior) return block;
  if (prior.includes(block.slice(0, 40))) return prior;
  return `${prior}\n\n${block}`;
}

export function coachingSuggestionCount(
  coaching: FilmClipCoachingRecommendations,
): number {
  return COACHING_CATEGORY_ORDER.reduce(
    (sum, key) => sum + coaching[key].length,
    0,
  );
}

export type CoachingCueKey = `${FilmClipCoachingCategoryId}:${number}`;

export function coachingCueKey(
  categoryId: FilmClipCoachingCategoryId,
  index: number,
): CoachingCueKey {
  return `${categoryId}:${index}`;
}

export function allCoachingCueKeys(
  coaching: FilmClipCoachingRecommendations,
): CoachingCueKey[] {
  const keys: CoachingCueKey[] = [];
  for (const categoryId of COACHING_CATEGORY_ORDER) {
    for (let index = 0; index < coaching[categoryId].length; index += 1) {
      keys.push(coachingCueKey(categoryId, index));
    }
  }
  return keys;
}

export function filterCoachingBySelectedKeys(
  coaching: FilmClipCoachingRecommendations,
  selected: ReadonlySet<string>,
): FilmClipCoachingRecommendations {
  const filtered = emptyCoachingRecommendations();
  for (const categoryId of COACHING_CATEGORY_ORDER) {
    for (let index = 0; index < coaching[categoryId].length; index += 1) {
      const item = coaching[categoryId][index];
      if (!item) continue;
      if (selected.has(coachingCueKey(categoryId, index))) {
        if (categoryId === "counters") {
          filtered.counters.push(item as import("@/lib/film-room/film-clip-analyze-types").FilmClipCounterSuggestion);
        } else {
          filtered[categoryId].push(item);
        }
      }
    }
  }
  return filtered;
}

export type { FilmClipCoachingSuggestion };
