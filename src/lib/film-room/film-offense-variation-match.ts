import type { OffenseReadSuggestion } from "@/lib/film-room/film-disruption-detector";
import type { FilmClipPlayPattern } from "@/lib/film-room/film-clip-analyze-types";
import type { StoredPlay } from "@/types/library";

export interface OffenseVariationMatch {
  play: StoredPlay;
  score: number;
  reasons: string[];
  readLabel?: string;
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

function isOffensePlay(play: StoredPlay, haystack: string) {
  const defenseTagged =
    haystack.includes("defense") ||
    haystack.includes("def ") ||
    play.tags?.some((tag) => /^def|zone press|switch all/i.test(tag));
  if (defenseTagged) return false;
  return play.type !== "drill" || !haystack.includes("defense");
}

function scorePlayForRead(
  play: StoredPlay,
  read: OffenseReadSuggestion,
  pattern?: string,
): { score: number; reasons: string[] } {
  const haystack = haystackForPlay(play);
  if (!isOffensePlay(play, haystack)) {
    return { score: 0, reasons: [] };
  }

  const reasons: string[] = [];
  let score = 0;

  for (const hint of read.searchHints) {
    if (hint.length < 3) continue;
    if (haystack.includes(hint.toLowerCase())) {
      score += 12;
      reasons.push(`read: ${hint}`);
    }
  }

  if (pattern) {
    const patternToken = pattern.toLowerCase();
    if (haystack.includes(patternToken)) {
      score += 8;
      reasons.push(`pattern: ${pattern}`);
    }
  }

  const readTokens = read.label
    .toLowerCase()
    .split(/[/,\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3);
  for (const token of readTokens) {
    if (haystack.includes(token)) {
      score += 6;
      reasons.push(`label: ${token}`);
    }
  }

  if (haystack.includes("counter") || haystack.includes("read")) {
    score += 3;
    reasons.push("counter/read tag");
  }

  return { score, reasons: [...new Set(reasons)] };
}

/** Match library offense plays to suggested reads after disruption. */
export function suggestOffensePlaysForRead(
  plays: StoredPlay[],
  read: OffenseReadSuggestion,
  excludedPlayIds: ReadonlySet<string>,
  pattern?: string,
  limit = 3,
): OffenseVariationMatch[] {
  const matches: OffenseVariationMatch[] = [];

  for (const play of plays) {
    if (excludedPlayIds.has(play.id)) continue;
    const { score, reasons } = scorePlayForRead(play, read, pattern);
    if (score <= 0) continue;
    matches.push({
      play,
      score,
      reasons,
      readLabel: read.label,
    });
  }

  return matches
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.play.title.localeCompare(b.play.title);
    })
    .slice(0, limit);
}

export function suggestOffensePlaysForDisruption(
  plays: StoredPlay[],
  reads: OffenseReadSuggestion[],
  excludedPlayIds: ReadonlySet<string>,
  pattern?: string,
  limitPerRead = 2,
): OffenseVariationMatch[] {
  const merged = new Map<string, OffenseVariationMatch>();

  for (const read of reads) {
    const rows = suggestOffensePlaysForRead(
      plays,
      read,
      excludedPlayIds,
      pattern,
      limitPerRead,
    );
    for (const row of rows) {
      const existing = merged.get(row.play.id);
      if (!existing || row.score > existing.score) {
        merged.set(row.play.id, row);
      }
    }
  }

  return [...merged.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.play.title.localeCompare(b.play.title);
  });
}

export function suggestOffensePlaysFromPatternsAndReads(
  plays: StoredPlay[],
  patterns: FilmClipPlayPattern[],
  reads: OffenseReadSuggestion[],
  excludedPlayIds: ReadonlySet<string>,
  limit = 6,
): OffenseVariationMatch[] {
  const pattern =
    patterns.length > 0
      ? [...patterns].sort((a, b) => b.confidence - a.confidence)[0]?.tag
      : undefined;
  return suggestOffensePlaysForDisruption(
    plays,
    reads,
    excludedPlayIds,
    pattern,
    2,
  ).slice(0, limit);
}
