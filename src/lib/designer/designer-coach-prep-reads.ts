import {
  buildPrepReadRecommendations,
  type PrepReadRecommendation,
} from "@/lib/game-plan/read-recommendations";
import type { GamePlan, PracticeSession } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export interface DesignerCoachPlayRef {
  id: string;
  title: string;
  tags?: string[];
  series?: string;
}

export function prepReadMatchesCurrentPlay(
  recommendation: PrepReadRecommendation,
  play: DesignerCoachPlayRef,
): boolean {
  if (recommendation.playId && recommendation.playId === play.id) {
    return true;
  }
  const call = recommendation.call.trim().toLowerCase();
  if (!call) return false;
  const title = play.title.trim().toLowerCase();
  if (title.includes(call) || call.includes(title)) return true;
  const tags = (play.tags ?? []).map((tag) => tag.toLowerCase());
  return tags.some((tag) => tag.includes(call) || call.includes(tag));
}

export function prioritizePrepReadsForPlay(
  recommendations: PrepReadRecommendation[],
  play: DesignerCoachPlayRef,
): PrepReadRecommendation[] {
  return [...recommendations].sort((left, right) => {
    const leftMatch = prepReadMatchesCurrentPlay(left, play) ? 1 : 0;
    const rightMatch = prepReadMatchesCurrentPlay(right, play) ? 1 : 0;
    if (rightMatch !== leftMatch) return rightMatch - leftMatch;
    if (right.matchesCoverage !== left.matchesCoverage) {
      return right.matchesCoverage ? 1 : -1;
    }
    return right.missRatePct - left.missRatePct;
  });
}

export function buildDesignerCoachPrepReads(
  plan: GamePlan,
  sessions: PracticeSession[],
  plays: StoredPlay[],
  allPlans: GamePlan[],
  play: DesignerCoachPlayRef,
  maxRecommendations = 5,
): PrepReadRecommendation[] {
  const recommendations = buildPrepReadRecommendations(
    plan,
    sessions,
    plays,
    allPlans,
    maxRecommendations + 2,
  );
  return prioritizePrepReadsForPlay(recommendations, play).slice(
    0,
    maxRecommendations,
  );
}

export function formatPrepReadCoachNotes(
  recommendation: PrepReadRecommendation,
  opponent: string,
  frameLabel: string,
): string {
  const source =
    recommendation.source === "opponent-history"
      ? `vs ${opponent}`
      : "team trend";
  const playHint = recommendation.playTitle
    ? ` · play: ${recommendation.playTitle}`
    : "";
  return `• Prep read (${frameLabel}) — ${recommendation.call}: ${recommendation.reason} (${source}${playHint})`;
}

/** Prefer an existing prep session for this opponent; else latest team session. */
export function findPrepReadPracticeSession(
  plan: GamePlan,
  sessions: PracticeSession[],
): PracticeSession | null {
  const opponentToken = plan.opponent.trim().toLowerCase();
  const teamSessions = sessions.filter((session) => session.team === plan.team);
  if (!teamSessions.length) return null;

  const opponentSession = teamSessions.find((session) => {
    const title = session.title.toLowerCase();
    return title.includes(opponentToken) || title.includes("prep");
  });
  if (opponentSession) return opponentSession;

  return [...teamSessions].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  )[0] ?? null;
}

export function prepReadPracticeSessionTitle(plan: GamePlan) {
  return `Prep vs ${plan.opponent} — reads`;
}
