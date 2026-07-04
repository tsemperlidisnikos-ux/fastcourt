import {
  isReadTrackableItem,
  readItemLabel,
} from "@/lib/practice/read-success-scorecard";
import type { GamePlan } from "@/types/library-meta";
import type { PracticeSession } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export interface GamePlanPlayReadStat {
  playId: string;
  playTitle: string;
  landed: number;
  missed: number;
  unmarked: number;
  calls: string[];
}

export interface GamePlanReadRollup {
  playStats: GamePlanPlayReadStat[];
  totalLanded: number;
  totalMissed: number;
  overallRatePct: number | null;
}

export function collectGamePlanPlayIds(plan: GamePlan): Set<string> {
  const ids = new Set<string>();
  for (const entry of plan.entries) {
    if (entry.playId) ids.add(entry.playId);
  }
  for (const ref of plan.filmRefs ?? []) {
    if (ref.playId) ids.add(ref.playId);
  }
  return ids;
}

export function buildGamePlanReadRollup(
  plan: GamePlan,
  sessions: PracticeSession[],
  plays: StoredPlay[],
): GamePlanReadRollup {
  const playIds = collectGamePlanPlayIds(plan);
  const playById = new Map(plays.map((play) => [play.id, play]));
  const stats = new Map<string, GamePlanPlayReadStat>();

  for (const playId of playIds) {
    stats.set(playId, {
      playId,
      playTitle: playById.get(playId)?.title ?? "Play",
      landed: 0,
      missed: 0,
      unmarked: 0,
      calls: [],
    });
  }

  for (const session of sessions) {
    for (const item of session.items) {
      if (!item.playId || !playIds.has(item.playId)) continue;
      if (!isReadTrackableItem(item)) continue;
      const row = stats.get(item.playId);
      if (!row) continue;
      if (item.readOutcome === "landed") row.landed += 1;
      else if (item.readOutcome === "missed") row.missed += 1;
      else row.unmarked += 1;
      const call = readItemLabel(item);
      if (!row.calls.includes(call)) row.calls.push(call);
    }
  }

  const playStats = [...stats.values()].filter(
    (row) => row.landed + row.missed + row.unmarked > 0,
  );
  playStats.sort(
    (a, b) => b.landed + b.missed - (a.landed + a.missed),
  );

  const totalLanded = playStats.reduce((sum, row) => sum + row.landed, 0);
  const totalMissed = playStats.reduce((sum, row) => sum + row.missed, 0);
  const marked = totalLanded + totalMissed;

  return {
    playStats,
    totalLanded,
    totalMissed,
    overallRatePct:
      marked > 0 ? Math.round((totalLanded / marked) * 100) : null,
  };
}
