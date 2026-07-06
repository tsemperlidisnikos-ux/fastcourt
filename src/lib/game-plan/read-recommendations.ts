import {
  buildOpponentReadRollup,
  filterOpponentPracticeSessions,
} from "@/lib/game-plan/opponent-read-rollup";
import {
  buildDrillSuggestions,
  DRILL_SUGGESTION_MAX_BLOCKS,
  DRILL_SUGGESTION_MIN_MISSED,
  DRILL_SUGGESTION_MIN_MISS_RATE,
} from "@/lib/practice/drill-suggestions";
import { newPracticeItemId } from "@/lib/practice/practice-items";
import type { GamePlan, PracticeSession, PracticeSessionItem } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export interface PrepReadRecommendation {
  id: string;
  call: string;
  playId?: string;
  playTitle?: string;
  missedCount: number;
  landedCount: number;
  missRatePct: number;
  suggestedBlocks: number;
  reason: string;
  coverages: string[];
  matchesCoverage: boolean;
  source: "opponent-history" | "team-trend";
}

export const OPPONENT_WEAK_READ_MIN_MISSED = 1;
export const OPPONENT_WEAK_READ_MIN_MISS_RATE = 40;

export function collectPlanCoverages(plan: GamePlan): string[] {
  const set = new Set<string>();
  for (const cue of plan.timeoutCues ?? []) {
    const cov = cue.coverage?.trim().toLowerCase();
    if (cov) set.add(cov);
  }
  return [...set];
}

function callMatchesCoverage(call: string, coverages: string[]): boolean {
  if (!coverages.length) return false;
  const c = call.toLowerCase();
  return coverages.some(
    (cov) =>
      c.includes(cov) ||
      cov.split(/\s+/).some((word) => word.length > 2 && c.includes(word)),
  );
}

function recommendationMatchesCoverage(
  rec: { call: string; playId?: string },
  plan: GamePlan,
  coverages: string[],
): boolean {
  if (!coverages.length) return false;
  if (callMatchesCoverage(rec.call, coverages)) return true;
  for (const ref of plan.filmRefs ?? []) {
    if (ref.playId === rec.playId && ref.readLabel) {
      if (callMatchesCoverage(ref.readLabel, coverages)) return true;
    }
  }
  return false;
}

function isWeakRead(landed: number, missed: number): boolean {
  const marked = landed + missed;
  if (marked < 1 || missed < OPPONENT_WEAK_READ_MIN_MISSED) return false;
  if (missed >= DRILL_SUGGESTION_MIN_MISSED) {
    const missRate = Math.round((missed / marked) * 100);
    return missRate >= DRILL_SUGGESTION_MIN_MISS_RATE;
  }
  if (marked === 2 && missed === 1) return true;
  const missRate = Math.round((missed / marked) * 100);
  return missRate >= OPPONENT_WEAK_READ_MIN_MISS_RATE;
}

function suggestedBlocksForMisses(missed: number): number {
  return Math.min(
    DRILL_SUGGESTION_MAX_BLOCKS,
    Math.max(1, Math.ceil(missed / 2)),
  );
}

export function buildPrepReadRecommendations(
  plan: GamePlan,
  sessions: PracticeSession[],
  plays: StoredPlay[],
  allPlans: GamePlan[] = [],
  maxRecommendations = 6,
): PrepReadRecommendation[] {
  const coverages = collectPlanCoverages(plan);
  const seenCalls = new Set<string>();
  const recommendations: PrepReadRecommendation[] = [];

  const rollup = buildOpponentReadRollup(plan, sessions, allPlans);
  for (const row of rollup.byCall) {
    if (!isWeakRead(row.landed, row.missed)) continue;
    const marked = row.landed + row.missed;
    const missRatePct = Math.round((row.missed / marked) * 100);
    if (seenCalls.has(row.call)) continue;
    seenCalls.add(row.call);
    recommendations.push({
      id: `${row.call}::opponent`,
      call: row.call,
      missedCount: row.missed,
      landedCount: row.landed,
      missRatePct,
      suggestedBlocks: suggestedBlocksForMisses(row.missed),
      reason: `${row.call} missed ${missRatePct}% vs ${plan.opponent} (${row.missed}/${marked})`,
      coverages,
      matchesCoverage: callMatchesCoverage(row.call, coverages),
      source: "opponent-history",
    });
  }

  const opponentSessions = filterOpponentPracticeSessions(
    plan,
    sessions,
    allPlans,
  );
  const teamSessions = sessions.filter((s) => s.team === plan.team);
  const drillSessions = opponentSessions.length ? opponentSessions : teamSessions;
  const teamDrills = buildDrillSuggestions(drillSessions, plays, 8);

  for (const drill of teamDrills) {
    const existing = recommendations.find((row) => row.call === drill.call);
    if (existing) {
      if (!existing.playId && drill.playId) {
        existing.playId = drill.playId;
        existing.playTitle = drill.playTitle;
      }
      continue;
    }
    if (seenCalls.has(drill.call)) continue;
    seenCalls.add(drill.call);
    recommendations.push({
      id: `${drill.call}::team`,
      call: drill.call,
      playId: drill.playId,
      playTitle: drill.playTitle,
      missedCount: drill.missedCount,
      landedCount: drill.landedCount,
      missRatePct: drill.missRatePct,
      suggestedBlocks: drill.suggestedBlocks,
      reason: drill.reason,
      coverages,
      matchesCoverage:
        recommendationMatchesCoverage(drill, plan, coverages) ||
        callMatchesCoverage(drill.call, coverages),
      source: "team-trend",
    });
  }

  recommendations.sort((a, b) => {
    if (a.matchesCoverage !== b.matchesCoverage) {
      return a.matchesCoverage ? -1 : 1;
    }
    if (b.missRatePct !== a.missRatePct) return b.missRatePct - a.missRatePct;
    return b.missedCount - a.missedCount;
  });

  return recommendations.slice(0, maxRecommendations);
}

export function createPrepReadPracticeItems(
  recommendation: PrepReadRecommendation,
): PracticeSessionItem[] {
  const notes =
    recommendation.matchesCoverage && recommendation.coverages.length
      ? `Prep drill — ${recommendation.reason}. Coverage focus: ${recommendation.coverages.join(", ")}.`
      : `Prep drill — ${recommendation.reason}.`;
  return Array.from({ length: recommendation.suggestedBlocks }, () => ({
    id: newPracticeItemId(),
    playId: recommendation.playId,
    cueLabel: recommendation.playId ? undefined : recommendation.call,
    liveCall: recommendation.call,
    durationMin: 10,
    notes,
  }));
}

export function countPrepReadBlocks(
  recommendations: PrepReadRecommendation[],
): number {
  return recommendations.reduce((sum, row) => sum + row.suggestedBlocks, 0);
}

export function buildPostGameReadOutcomeNotes(
  plan: GamePlan,
  sessions: PracticeSession[],
  allPlans: GamePlan[] = [],
): string | undefined {
  const rollup = buildOpponentReadRollup(plan, sessions, allPlans);
  const marked = rollup.totalLanded + rollup.totalMissed;
  if (marked === 0) return undefined;

  const lines = [
    `[Reads vs ${plan.opponent}] ${rollup.overallRatePct ?? "—"}% landed (${rollup.totalLanded}✓ ${rollup.totalMissed}✗)`,
  ];
  for (const row of rollup.byCall.slice(0, 6)) {
    const rowMarked = row.landed + row.missed;
    if (rowMarked === 0) continue;
    const rate = Math.round((row.landed / rowMarked) * 100);
    lines.push(`· ${row.call}: ${rate}% (${row.landed}✓ ${row.missed}✗)`);
  }
  return lines.join("\n");
}

export function mergePostGameNotes(
  userNotes: string,
  readOutcomes: string | undefined,
): string | undefined {
  const trimmed = userNotes.trim();
  if (!readOutcomes?.trim()) return trimmed || undefined;
  const marker = readOutcomes.split("\n")[0] ?? "";
  if (marker && trimmed.includes(marker)) return trimmed || undefined;
  if (!trimmed) return readOutcomes.trim();
  return `${trimmed}\n\n${readOutcomes.trim()}`;
}
