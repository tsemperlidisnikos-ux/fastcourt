import {
  formatPracticeLiveCall,
  resolvePracticeDisruptionCue,
} from "@/lib/practice/practice-disruption-cue";
import type { PracticeSession, PracticeSessionItem } from "@/types/library-meta";

export function isReadTrackableItem(item: PracticeSessionItem): boolean {
  if (item.liveCall?.trim()) return true;
  if (item.designerFrameIndex !== undefined) return true;
  const cue = resolvePracticeDisruptionCue(item);
  return !!(cue?.filmRead || cue?.readDetail || cue?.broke);
}

export function readItemLabel(item: PracticeSessionItem): string {
  const cue = resolvePracticeDisruptionCue(item);
  const call = cue ? formatPracticeLiveCall(cue) : null;
  return call || item.cueLabel?.trim() || "Read";
}

export interface PracticeReadCallStat {
  call: string;
  landed: number;
  missed: number;
  unmarked: number;
}

export interface PracticeReadScorecard {
  trackableCount: number;
  markedCount: number;
  landedCount: number;
  missedCount: number;
  unmarkedCount: number;
  successRatePct: number | null;
  byCall: PracticeReadCallStat[];
}

export function buildPracticeReadScorecard(
  session: PracticeSession,
): PracticeReadScorecard {
  const trackable = session.items.filter(isReadTrackableItem);
  let landedCount = 0;
  let missedCount = 0;
  let unmarkedCount = 0;
  const callMap = new Map<string, PracticeReadCallStat>();

  for (const item of trackable) {
    const call = readItemLabel(item);
    const bucket = callMap.get(call) ?? {
      call,
      landed: 0,
      missed: 0,
      unmarked: 0,
    };
    if (item.readOutcome === "landed") {
      landedCount += 1;
      bucket.landed += 1;
    } else if (item.readOutcome === "missed") {
      missedCount += 1;
      bucket.missed += 1;
    } else {
      unmarkedCount += 1;
      bucket.unmarked += 1;
    }
    callMap.set(call, bucket);
  }

  const markedCount = landedCount + missedCount;

  return {
    trackableCount: trackable.length,
    markedCount,
    landedCount,
    missedCount,
    unmarkedCount,
    successRatePct:
      markedCount > 0 ? Math.round((landedCount / markedCount) * 100) : null,
    byCall: [...callMap.values()].sort(
      (a, b) =>
        b.landed + b.missed + b.unmarked - (a.landed + a.missed + a.unmarked),
    ),
  };
}

export interface PracticeReadTrendPoint {
  sessionId: string;
  title: string;
  date: string;
  successRatePct: number | null;
  landedCount: number;
  missedCount: number;
  trackableCount: number;
}

export function buildPracticeReadTrend(
  sessions: PracticeSession[],
  maxSessions = 5,
): PracticeReadTrendPoint[] {
  return [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((session) => {
      const scorecard = buildPracticeReadScorecard(session);
      return {
        sessionId: session.id,
        title: session.title,
        date: session.date,
        successRatePct: scorecard.successRatePct,
        landedCount: scorecard.landedCount,
        missedCount: scorecard.missedCount,
        trackableCount: scorecard.trackableCount,
      };
    })
    .filter((row) => row.trackableCount > 0)
    .slice(0, maxSessions);
}

export function formatReadSuccessLine(scorecard: PracticeReadScorecard): string {
  if (!scorecard.trackableCount) {
    return "No disruption reads in this session.";
  }
  const parts = [
    `${scorecard.landedCount} landed`,
    `${scorecard.missedCount} missed`,
  ];
  if (scorecard.unmarkedCount) {
    parts.push(`${scorecard.unmarkedCount} unmarked`);
  }
  if (scorecard.successRatePct !== null) {
    parts.push(`${scorecard.successRatePct}% success`);
  }
  return parts.join(" · ");
}
