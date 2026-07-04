import { normalizeOpponentKey } from "@/lib/game-plan/opponent-history";
import {
  isReadTrackableItem,
  readItemLabel,
  type PracticeReadCallStat,
} from "@/lib/practice/read-success-scorecard";
import type { GamePlan, PracticeSession } from "@/types/library-meta";

const OPPONENT_PREP_DAYS = 21;

function parseLocalDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) {
    const parsed = new Date(iso);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function daysBetween(start: Date, end: Date): number {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function collectOpponentPlayIds(
  plans: GamePlan[],
  opponent: string,
): Set<string> {
  const key = normalizeOpponentKey(opponent);
  if (!key) return new Set();
  const ids = new Set<string>();
  for (const plan of plans) {
    if (normalizeOpponentKey(plan.opponent) !== key) continue;
    for (const entry of plan.entries) {
      if (entry.playId) ids.add(entry.playId);
    }
    for (const ref of plan.filmRefs ?? []) {
      if (ref.playId) ids.add(ref.playId);
    }
  }
  return ids;
}

export function sessionMatchesOpponent(
  session: PracticeSession,
  plan: GamePlan,
  opponentPlayIds?: Set<string>,
): boolean {
  if (session.team !== plan.team) return false;
  const opponentKey = normalizeOpponentKey(plan.opponent);
  if (!opponentKey) return false;

  const titleKey = normalizeOpponentKey(session.title);
  const notesKey = normalizeOpponentKey(session.notes || "");
  if (titleKey.includes(opponentKey) || notesKey.includes(opponentKey)) {
    return true;
  }

  const gameDate = parseLocalDate(plan.gameDate);
  const sessionDate = parseLocalDate(session.date);
  if (gameDate && sessionDate) {
    const diff = daysBetween(sessionDate, gameDate);
    if (diff >= 0 && diff <= OPPONENT_PREP_DAYS) {
      if (opponentPlayIds?.size) {
        const hasPlanPlay = session.items.some(
          (item) => item.playId && opponentPlayIds.has(item.playId),
        );
        if (hasPlanPlay) return true;
      }
    }
  }

  if (opponentPlayIds?.size) {
    const markedReads = session.items.filter(
      (item) =>
        item.playId &&
        opponentPlayIds.has(item.playId) &&
        isReadTrackableItem(item) &&
        item.readOutcome,
    );
    if (markedReads.length > 0) return true;
  }

  return false;
}

export function filterOpponentPracticeSessions(
  plan: GamePlan,
  sessions: PracticeSession[],
  allPlans: GamePlan[] = [],
): PracticeSession[] {
  const opponentPlayIds = collectOpponentPlayIds(
    allPlans.length ? allPlans : [plan],
    plan.opponent,
  );
  return sessions.filter((session) =>
    sessionMatchesOpponent(session, plan, opponentPlayIds),
  );
}

export interface OpponentReadRollup {
  opponent: string;
  sessionCount: number;
  totalLanded: number;
  totalMissed: number;
  overallRatePct: number | null;
  byCall: PracticeReadCallStat[];
}

export function buildOpponentReadRollup(
  plan: GamePlan,
  sessions: PracticeSession[],
  allPlans: GamePlan[] = [],
): OpponentReadRollup {
  const scoped = filterOpponentPracticeSessions(plan, sessions, allPlans);
  const callMap = new Map<string, PracticeReadCallStat>();
  let totalLanded = 0;
  let totalMissed = 0;

  for (const session of scoped) {
    for (const item of session.items) {
      if (!isReadTrackableItem(item)) continue;
      const call = readItemLabel(item);
      const bucket = callMap.get(call) ?? {
        call,
        landed: 0,
        missed: 0,
        unmarked: 0,
      };
      if (item.readOutcome === "landed") {
        totalLanded += 1;
        bucket.landed += 1;
      } else if (item.readOutcome === "missed") {
        totalMissed += 1;
        bucket.missed += 1;
      } else {
        bucket.unmarked += 1;
      }
      callMap.set(call, bucket);
    }
  }

  const marked = totalLanded + totalMissed;
  const byCall = [...callMap.values()]
    .filter((row) => row.landed + row.missed + row.unmarked > 0)
    .sort(
      (a, b) =>
        b.landed + b.missed + b.unmarked - (a.landed + a.missed + a.unmarked),
    );

  return {
    opponent: plan.opponent,
    sessionCount: scoped.length,
    totalLanded,
    totalMissed,
    overallRatePct:
      marked > 0 ? Math.round((totalLanded / marked) * 100) : null,
    byCall,
  };
}

export function opponentScopedSessionsForReadLookup(
  plan: GamePlan,
  sessions: PracticeSession[],
  allPlans: GamePlan[] = [],
): PracticeSession[] {
  const scoped = filterOpponentPracticeSessions(plan, sessions, allPlans);
  return scoped.length ? scoped : sessions.filter((s) => s.team === plan.team);
}
