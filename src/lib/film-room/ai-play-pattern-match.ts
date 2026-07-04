import type { GamePlanCategoryId } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import type { FilmClipPlayPattern } from "@/lib/film-room/film-clip-analyze-types";

export interface AiPatternPlayMatch {
  play: StoredPlay;
  score: number;
  reasons: string[];
}

const PATTERN_HINTS: Record<string, readonly string[]> = {
  horns: ["horns", "horn"],
  pnr: ["pnr", "pick and roll", "ball screen", "pick-and-roll"],
  flare: ["flare"],
  stagger: ["stagger"],
  spain: ["spain"],
  motion: ["motion"],
  flex: ["flex"],
  iso: ["iso", "isolation"],
  blob: ["blob", "baseline out"],
  slob: ["slob", "sideline out"],
  ato: ["ato", "after timeout"],
  transition: ["transition", "fast break"],
  zone: ["zone"],
  press: ["press", "full court"],
  dribble: ["dribble handoff", "dho"],
  post: ["post", "low post"],
  stack: ["stack"],
  zipper: ["zipper"],
  floppy: ["floppy"],
};

const PATTERN_TO_CATEGORY: Record<string, GamePlanCategoryId> = {
  blob: "blob",
  slob: "slob",
  ato: "ato",
  transition: "transition",
  zone: "zone",
  press: "press",
};

function normalizeToken(value: string) {
  return value.trim().toLowerCase();
}

function haystackForPlay(play: StoredPlay) {
  return [
    play.title,
    play.series,
    ...(play.tags || []),
    play.playNotes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scorePlayForPattern(
  play: StoredPlay,
  pattern: FilmClipPlayPattern,
): { score: number; reasons: string[] } {
  const token = normalizeToken(pattern.tag);
  const hints = PATTERN_HINTS[token] ?? [token];
  const haystack = haystackForPlay(play);
  const reasons: string[] = [];
  let score = 0;

  for (const hint of hints) {
    if (!hint || hint.length < 2) continue;
    if (haystack.includes(hint)) {
      score += 12;
      reasons.push(`tag: ${hint}`);
    }
  }

  if (score > 0) {
    score += Math.round(pattern.confidence * 8);
  }

  return { score, reasons: [...new Set(reasons)] };
}

/** Match library plays to AI-recognized set/action patterns. */
export function suggestPlaysFromAiPatterns(
  plays: StoredPlay[],
  patterns: FilmClipPlayPattern[],
  excludedPlayIds: ReadonlySet<string>,
  limit = 6,
): AiPatternPlayMatch[] {
  if (!patterns.length) return [];

  const merged = new Map<string, AiPatternPlayMatch>();

  for (const play of plays) {
    if (excludedPlayIds.has(play.id)) continue;
    let bestScore = 0;
    let bestReasons: string[] = [];

    for (const pattern of patterns) {
      const { score, reasons } = scorePlayForPattern(play, pattern);
      if (score > bestScore) {
        bestScore = score;
        bestReasons = reasons;
      }
    }

    if (bestScore <= 0) continue;
    const existing = merged.get(play.id);
    if (!existing || bestScore > existing.score) {
      merged.set(play.id, { play, score: bestScore, reasons: bestReasons });
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.play.title.localeCompare(b.play.title);
    })
    .slice(0, limit);
}

export function gamePlanCategoryForPattern(tag: string): GamePlanCategoryId {
  const key = normalizeToken(tag);
  return PATTERN_TO_CATEGORY[key] ?? "halfcourt";
}

export function offenseCategoriesForPatterns(
  patterns: FilmClipPlayPattern[],
): GamePlanCategoryId[] {
  const out = new Set<GamePlanCategoryId>();
  for (const pattern of patterns) {
    out.add(gamePlanCategoryForPattern(pattern.tag));
  }
  return [...out];
}
