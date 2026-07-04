import {
  isReadTrackableItem,
  readItemLabel,
} from "@/lib/practice/read-success-scorecard";
import { newPracticeItemId } from "@/lib/practice/practice-items";
import type { PracticeSession, PracticeSessionItem } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export interface DrillCallAggregate {
  call: string;
  playId?: string;
  landed: number;
  missed: number;
  unmarked: number;
}

export interface DrillSuggestion {
  id: string;
  call: string;
  playId?: string;
  playTitle?: string;
  missedCount: number;
  landedCount: number;
  missRatePct: number;
  suggestedBlocks: number;
  reason: string;
}

export const DRILL_SUGGESTION_MIN_MISSED = 2;
export const DRILL_SUGGESTION_MIN_MISS_RATE = 40;
export const DRILL_SUGGESTION_MAX_BLOCKS = 3;

function aggregateDrillCalls(
  sessions: PracticeSession[],
  maxSessions = 12,
): DrillCallAggregate[] {
  const map = new Map<string, DrillCallAggregate>();
  const recent = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxSessions);

  for (const session of recent) {
    for (const item of session.items) {
      if (!isReadTrackableItem(item)) continue;
      const call = readItemLabel(item);
      const key = `${call}::${item.playId ?? "cue"}`;
      const bucket = map.get(key) ?? {
        call,
        playId: item.playId,
        landed: 0,
        missed: 0,
        unmarked: 0,
      };
      if (item.readOutcome === "landed") bucket.landed += 1;
      else if (item.readOutcome === "missed") bucket.missed += 1;
      else bucket.unmarked += 1;
      map.set(key, bucket);
    }
  }

  return [...map.values()].sort((a, b) => b.missed - a.missed);
}

export function buildDrillSuggestions(
  sessions: PracticeSession[],
  plays: StoredPlay[],
  maxSuggestions = 5,
): DrillSuggestion[] {
  const playById = new Map(plays.map((play) => [play.id, play]));
  const aggregates = aggregateDrillCalls(sessions);

  const suggestions: DrillSuggestion[] = [];
  for (const row of aggregates) {
    const marked = row.landed + row.missed;
    if (marked < 1 || row.missed < DRILL_SUGGESTION_MIN_MISSED) continue;
    const missRatePct = Math.round((row.missed / marked) * 100);
    if (missRatePct < DRILL_SUGGESTION_MIN_MISS_RATE) continue;
    const suggestedBlocks = Math.min(
      DRILL_SUGGESTION_MAX_BLOCKS,
      Math.max(1, Math.ceil(row.missed / 2)),
    );
    suggestions.push({
      id: `${row.call}::${row.playId ?? "cue"}`,
      call: row.call,
      playId: row.playId,
      playTitle: row.playId ? playById.get(row.playId)?.title : undefined,
      missedCount: row.missed,
      landedCount: row.landed,
      missRatePct,
      suggestedBlocks,
      reason: `${row.call} missed ${missRatePct}% (${row.missed}/${marked}) in recent sessions`,
    });
    if (suggestions.length >= maxSuggestions) break;
  }
  return suggestions;
}

export function createDrillPracticeItems(
  suggestion: DrillSuggestion,
): PracticeSessionItem[] {
  const notes = `Drill focus — ${suggestion.reason}.`;
  return Array.from({ length: suggestion.suggestedBlocks }, () => ({
    id: newPracticeItemId(),
    playId: suggestion.playId,
    cueLabel: suggestion.playId ? undefined : suggestion.call,
    liveCall: suggestion.call,
    durationMin: 10,
    notes,
  }));
}
