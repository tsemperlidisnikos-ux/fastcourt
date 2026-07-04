import { buildDrillSuggestions, type DrillSuggestion } from "@/lib/practice/drill-suggestions";
import {
  buildPracticeReadScorecard,
  buildPracticeReadTrend,
  type PracticeReadTrendPoint,
} from "@/lib/practice/read-success-scorecard";
import {
  buildFilmSessionEvaluation,
  type FilmSessionEvaluation,
} from "@/lib/film-room/film-read-evaluation";
import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import type { PracticeSession } from "@/types/library-meta";
import type { FilmRoomSession } from "@/types/film-room";
import type { StoredPlay } from "@/types/library";

export interface CoachFilmSessionSummary {
  sessionId: string;
  title: string;
  evaluation: FilmSessionEvaluation;
  link: string;
}

export interface CoachDashboardModel {
  overallReadRatePct: number | null;
  totalLanded: number;
  totalMissed: number;
  practiceTrend: PracticeReadTrendPoint[];
  filmSessions: CoachFilmSessionSummary[];
  drillSuggestions: DrillSuggestion[];
}

export function buildCoachDashboardModel(input: {
  practiceSessions: PracticeSession[];
  filmSessions: FilmRoomSession[];
  plays: StoredPlay[];
  origin: string;
  teamFilter?: string;
}): CoachDashboardModel {
  const team = input.teamFilter?.trim();
  const practiceSessions = team
    ? input.practiceSessions.filter((row) => row.team === team)
    : input.practiceSessions;

  let totalLanded = 0;
  let totalMissed = 0;
  for (const session of practiceSessions) {
    const card = buildPracticeReadScorecard(session);
    totalLanded += card.landedCount;
    totalMissed += card.missedCount;
  }
  const marked = totalLanded + totalMissed;

  const filmSessions = input.filmSessions
    .map((session) => ({
      sessionId: session.id,
      title: session.title,
      evaluation: buildFilmSessionEvaluation(session.analyses ?? []),
      link: `${input.origin}${buildFilmRoomDeepLink(session.id)}`,
    }))
    .filter((row) => row.evaluation.analyzedCount > 0)
    .sort(
      (a, b) =>
        b.evaluation.disruptionDetectedCount - a.evaluation.disruptionDetectedCount,
    )
    .slice(0, 8);

  return {
    overallReadRatePct:
      marked > 0 ? Math.round((totalLanded / marked) * 100) : null,
    totalLanded,
    totalMissed,
    practiceTrend: buildPracticeReadTrend(practiceSessions, 6),
    filmSessions,
    drillSuggestions: buildDrillSuggestions(practiceSessions, input.plays, 6),
  };
}

export function coachTrendBarHeight(rate: number | null, max = 100): number {
  if (rate == null) return 8;
  return Math.max(8, Math.round((rate / max) * 100));
}
