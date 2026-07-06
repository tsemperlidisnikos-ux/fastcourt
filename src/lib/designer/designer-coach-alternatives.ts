import { buildDesignerCoachPrepReads } from "@/lib/designer/designer-coach-prep-reads";
import type {
  DesignerCoachAlternative,
  DesignerCoachLinkedPlay,
  DesignerCoachPlayContext,
} from "@/lib/designer/analyze-play-locally";
import {
  fingerprintPlay,
  playSimilarity,
} from "@/lib/library/play-dna";
import type { FilmClipCoachingSuggestion } from "@/lib/film-room/film-clip-analyze-types";
import type { GamePlan, PlaybookSection, PracticeSession } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export const COACH_ALTERNATIVE_WEIGHTS = {
  dna: 40,
  series: 25,
  gamePlan: 20,
  prepRead: 15,
} as const;

const MAX_COMBINED_SCORE =
  COACH_ALTERNATIVE_WEIGHTS.dna +
  COACH_ALTERNATIVE_WEIGHTS.series +
  COACH_ALTERNATIVE_WEIGHTS.gamePlan +
  COACH_ALTERNATIVE_WEIGHTS.prepRead;

const MIN_TOTAL_SCORE = 15;
const DEFAULT_LIMIT = 5;

export interface RankCoachAlternativesInput {
  play: DesignerCoachPlayContext;
  library: StoredPlay[];
  playbooks?: PlaybookSection[];
  gamePlan?: GamePlan | null;
  allGamePlans?: GamePlan[];
  practiceSessions?: PracticeSession[];
  limit?: number;
}

interface PrepReadScore {
  missRatePct: number;
  call: string;
}

function normalizeToken(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function sharePlaybook(
  leftId: string,
  rightId: string,
  playbooks: PlaybookSection[],
) {
  return playbooks.some(
    (section) =>
      section.playRefs.includes(leftId) && section.playRefs.includes(rightId),
  );
}

function scoreSeries(
  current: DesignerCoachPlayContext,
  candidate: StoredPlay,
  playbooks: PlaybookSection[],
): { points: number; reason?: string } {
  const currentSeries = normalizeToken(current.series);
  const candidateSeries = normalizeToken(candidate.series);
  if (currentSeries && candidateSeries && currentSeries === candidateSeries) {
    return {
      points: COACH_ALTERNATIVE_WEIGHTS.series,
      reason: `series: ${candidate.series}`,
    };
  }
  if (playbooks.length && sharePlaybook(current.id, candidate.id, playbooks)) {
    return {
      points: Math.round(COACH_ALTERNATIVE_WEIGHTS.series * 0.72),
      reason: "same playbook",
    };
  }
  return { points: 0 };
}

function scoreGamePlan(
  playId: string,
  plan?: GamePlan | null,
): { points: number; reason?: string } {
  if (!plan) return { points: 0 };
  const entry = plan.entries.find((row) => row.playId === playId);
  if (!entry) return { points: 0 };
  return {
    points: COACH_ALTERNATIVE_WEIGHTS.gamePlan,
    reason: `game plan (${entry.categoryId})`,
  };
}

function buildPrepReadScoreMap(
  plan: GamePlan,
  sessions: PracticeSession[],
  library: StoredPlay[],
  allPlans: GamePlan[],
  play: DesignerCoachPlayContext,
) {
  const map = new Map<string, PrepReadScore>();
  const recommendations = buildDesignerCoachPrepReads(
    plan,
    sessions,
    library,
    allPlans,
    {
      id: play.id,
      title: play.title,
      tags: play.tags,
      series: play.series,
    },
    8,
  );
  for (const row of recommendations) {
    if (!row.playId) continue;
    const existing = map.get(row.playId);
    if (!existing || row.missRatePct > existing.missRatePct) {
      map.set(row.playId, { missRatePct: row.missRatePct, call: row.call });
    }
  }
  return map;
}

function scorePrepRead(
  playId: string,
  prepReadScores: Map<string, PrepReadScore>,
): { points: number; reason?: string } {
  const row = prepReadScores.get(playId);
  if (!row) return { points: 0 };
  const ratio = Math.min(100, Math.max(0, row.missRatePct)) / 100;
  const points = Math.round(COACH_ALTERNATIVE_WEIGHTS.prepRead * ratio);
  if (points <= 0) return { points: 0 };
  return {
    points,
    reason: `prep read: ${row.call} (${row.missRatePct}% miss)`,
  };
}

function alternativePriority(
  scorePct: number,
): FilmClipCoachingSuggestion["priority"] {
  if (scorePct >= 70) return "medium";
  return "low";
}

export function rankCoachAlternativePlays(input: RankCoachAlternativesInput) {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const playbooks = input.playbooks ?? [];
  const targetFp = fingerprintPlay(input.play as StoredPlay);
  const prepReadScores =
    input.gamePlan && input.practiceSessions
      ? buildPrepReadScoreMap(
          input.gamePlan,
          input.practiceSessions,
          input.library,
          input.allGamePlans ?? [],
          input.play,
        )
      : new Map<string, PrepReadScore>();

  const scored: Array<{
    play: StoredPlay;
    totalScore: number;
    scorePct: number;
    reasons: string[];
  }> = [];

  for (const candidate of input.library) {
    if (candidate.id === input.play.id) continue;

    const reasons: string[] = [];
    let totalScore = 0;

    if (targetFp) {
      const candidateFp = fingerprintPlay(candidate);
      if (candidateFp) {
        const similarity = playSimilarity(targetFp, candidateFp);
        const dnaPoints = similarity * COACH_ALTERNATIVE_WEIGHTS.dna;
        if (dnaPoints > 0.5) {
          totalScore += dnaPoints;
          reasons.push(`DNA ${Math.round(similarity * 100)}%`);
        }
      }
    }

    const series = scoreSeries(input.play, candidate, playbooks);
    if (series.points) {
      totalScore += series.points;
      if (series.reason) reasons.push(series.reason);
    }

    const gamePlan = scoreGamePlan(candidate.id, input.gamePlan);
    if (gamePlan.points) {
      totalScore += gamePlan.points;
      if (gamePlan.reason) reasons.push(gamePlan.reason);
    }

    const prepRead = scorePrepRead(candidate.id, prepReadScores);
    if (prepRead.points) {
      totalScore += prepRead.points;
      if (prepRead.reason) reasons.push(prepRead.reason);
    }

    if (totalScore < MIN_TOTAL_SCORE) continue;

    scored.push({
      play: candidate,
      totalScore,
      scorePct: Math.round((totalScore / MAX_COMBINED_SCORE) * 100),
      reasons,
    });
  }

  return scored
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }
      return left.play.title.localeCompare(right.play.title);
    })
    .slice(0, limit);
}

export function buildCoachAlternatives(input: RankCoachAlternativesInput): {
  alternatives: DesignerCoachAlternative[];
  coachingItems: FilmClipCoachingSuggestion[];
  linked: DesignerCoachLinkedPlay[];
} {
  const ranked = rankCoachAlternativePlays(input);
  const alternatives: DesignerCoachAlternative[] = ranked.map((row) => {
    const detail = `${row.reasons.join(" · ")} — import a frame as an alternative look.`;
    return {
      title: row.play.title,
      detail,
      priority: alternativePriority(row.scorePct),
      playId: row.play.id,
      playTitle: row.play.title,
      scorePct: row.scorePct,
      kind: "library",
    };
  });

  const coachingItems: FilmClipCoachingSuggestion[] = alternatives.map(
    ({ title, detail, priority }) => ({ title, detail, priority }),
  );

  const linked: DesignerCoachLinkedPlay[] = alternatives.map(
    ({ playId, playTitle, scorePct, detail }) => ({
      playId,
      title: playTitle,
      reason: detail.split(" — ")[0] ?? `${scorePct}% match`,
    }),
  );

  return { alternatives, coachingItems, linked };
}
