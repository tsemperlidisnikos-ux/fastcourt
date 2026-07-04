import { gamePlanCategoryLabel } from "@/lib/game-plan/constants";
import {
  findSimilarPlays,
  formatSimilarityScore,
} from "@/lib/library/play-dna";
import type { GamePlanCategoryId } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

const CATEGORY_TAG_HINTS: Record<GamePlanCategoryId, readonly string[]> = {
  ato: ["ato", "after timeout", "timeout"],
  blob: ["blob", "baseline", "baseline ob", "out of bounds"],
  slob: ["slob", "sideline", "sideline ob"],
  zone: ["zone", "vs zone", "2-3", "3-2", "1-3-1"],
  press: ["press", "trap", "full court", "vs press"],
  halfcourt: ["half court", "halfcourt", "set", "offense"],
  transition: ["transition", "early", "fast break"],
  defense: ["defense", "defensive", "shell"],
  special: ["special", "end of clock", "buzzer", "need 3"],
  custom: [],
};

export interface GamePlanPlaySuggestion {
  play: StoredPlay;
  score: number;
  reasons: string[];
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function scorePlayForCategory(
  play: StoredPlay,
  categoryId: GamePlanCategoryId,
): GamePlanPlaySuggestion | null {
  const hints = CATEGORY_TAG_HINTS[categoryId];
  if (!hints.length) return null;

  let score = 0;
  const reasons: string[] = [];
  const tags = (play.tags || []).map(normalizeToken);
  const series = normalizeToken(play.series || "");
  const title = normalizeToken(play.title || "");
  const notes = normalizeToken(play.playNotes || "");

  for (const hint of hints) {
    const token = normalizeToken(hint);
    if (!token) continue;

    if (tags.some((tag) => tag === token)) {
      score += 12;
      if (!reasons.includes(`tag: ${hint}`)) reasons.push(`tag: ${hint}`);
      continue;
    }
    if (tags.some((tag) => tag.includes(token) || token.includes(tag))) {
      score += 8;
      if (!reasons.includes(`tag ~ ${hint}`)) reasons.push(`tag ~ ${hint}`);
      continue;
    }
    if (series && (series === token || series.includes(token) || token.includes(series))) {
      score += 6;
      if (!reasons.includes(`series: ${play.series}`)) reasons.push(`series: ${play.series}`);
      continue;
    }
    if (title.includes(token)) {
      score += 4;
      if (!reasons.includes(`title match`)) reasons.push("title match");
      continue;
    }
    if (notes.includes(token)) {
      score += 2;
      if (!reasons.includes(`notes match`)) reasons.push("notes match");
    }
  }

  if (!score) return null;
  if (play.favorite) {
    score += 2;
    reasons.push("favorite");
  }

  const ageDays = Math.max(
    0,
    (Date.now() - new Date(play.updatedAt).getTime()) / 86_400_000,
  );
  if (ageDays <= 30) score += 1;

  return { play, score, reasons };
}

export function suggestPlaysForGamePlanCategory(
  plays: StoredPlay[],
  categoryId: GamePlanCategoryId,
  excludedPlayIds: ReadonlySet<string>,
  limit = 8,
): GamePlanPlaySuggestion[] {
  const suggestions: GamePlanPlaySuggestion[] = [];
  for (const play of plays) {
    if (excludedPlayIds.has(play.id)) continue;
    const scored = scorePlayForCategory(play, categoryId);
    if (scored) suggestions.push(scored);
  }

  return suggestions
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.play.title.localeCompare(b.play.title);
    })
    .slice(0, limit);
}

export function gamePlanSuggestModalTitle(categoryId: GamePlanCategoryId) {
  return `Suggest for ${gamePlanCategoryLabel(categoryId)}`;
}

/** Merge tag-based suggestions with Play DNA matches from anchor plays in the plan. */
export function enrichSuggestionsWithPlayDna(
  tagSuggestions: GamePlanPlaySuggestion[],
  anchorPlays: StoredPlay[],
  allPlays: StoredPlay[],
  excludedPlayIds: ReadonlySet<string>,
  limit = 8,
): GamePlanPlaySuggestion[] {
  const merged = new Map<string, GamePlanPlaySuggestion>();
  for (const row of tagSuggestions) {
    merged.set(row.play.id, row);
  }

  for (const anchor of anchorPlays) {
    const similar = findSimilarPlays(anchor, allPlays, {
      limit: 4,
      minScore: 0.45,
    });
    for (const { play, score } of similar) {
      if (excludedPlayIds.has(play.id)) continue;
      const dnaScore = Math.round(score * 20);
      const reason = `DNA ~ ${anchor.title} (${formatSimilarityScore(score)})`;
      const existing = merged.get(play.id);
      if (!existing) {
        merged.set(play.id, { play, score: dnaScore, reasons: [reason] });
        continue;
      }
      merged.set(play.id, {
        ...existing,
        score: existing.score + dnaScore,
        reasons: [...new Set([...existing.reasons, reason])],
      });
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.play.title.localeCompare(b.play.title);
    })
    .slice(0, limit);
}
