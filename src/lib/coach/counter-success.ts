import {
  COUNTER_PRACTICE_NOTES_PREFIX,
  isCounterPracticeItem,
} from "@/lib/practice/counter-practice";
import {
  isReadTrackableItem,
  readItemLabel,
} from "@/lib/practice/read-success-scorecard";
import type { GamePlan, PracticeSession } from "@/types/library-meta";

export interface CounterSuccessRow {
  id: string;
  call: string;
  coverage?: string;
  targetsPattern?: string;
  landed: number;
  missed: number;
  unmarked: number;
  sessionCount: number;
  successRatePct: number | null;
  source: "practice" | "timeout-cue";
  gamePlanTitle?: string;
}

export interface CounterSuccessModel {
  rows: CounterSuccessRow[];
  totalLanded: number;
  totalMissed: number;
  overallRatePct: number | null;
  practicedCueCount: number;
  pendingCueCount: number;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function cueMatchKey(title: string, coverage?: string, pattern?: string) {
  return [title, coverage ?? "", pattern ?? ""].map(normalizeKey).join("|");
}

function practiceCallMatchesCue(
  call: string,
  title: string,
  _coverage?: string,
  pattern?: string,
): boolean {
  const hay = normalizeKey(call);
  const titleKey = normalizeKey(title);
  if (!titleKey || !hay.includes(titleKey)) return false;
  if (pattern && !hay.includes(normalizeKey(pattern))) {
    return hay.includes(titleKey);
  }
  return true;
}

/** Aggregate Counter drill practice marks + pending Game Plan timeout cues. */
export function buildCounterSuccessModel(
  practiceSessions: PracticeSession[],
  gamePlans: GamePlan[],
  maxRows = 8,
): CounterSuccessModel {
  const map = new Map<
    string,
    CounterSuccessRow & { sessionIds: Set<string> }
  >();

  for (const session of practiceSessions) {
    for (const item of session.items) {
      if (!isReadTrackableItem(item) || !isCounterPracticeItem(item)) continue;
      const call = readItemLabel(item);
      const key = normalizeKey(call);
      const row =
        map.get(key) ??
        ({
          id: key,
          call,
          landed: 0,
          missed: 0,
          unmarked: 0,
          sessionCount: 0,
          successRatePct: null,
          source: "practice" as const,
          sessionIds: new Set<string>(),
        } satisfies CounterSuccessRow & { sessionIds: Set<string> });

      if (item.readOutcome === "landed") row.landed += 1;
      else if (item.readOutcome === "missed") row.missed += 1;
      else row.unmarked += 1;
      row.sessionIds.add(session.id);
      map.set(key, row);
    }
  }

  let pendingCueCount = 0;
  for (const plan of gamePlans) {
    for (const cue of plan.timeoutCues ?? []) {
      const title = cue.title.trim();
      if (!title) continue;
      const already = [...map.values()].some((row) =>
        practiceCallMatchesCue(
          row.call,
          title,
          cue.coverage,
          cue.targetsPattern,
        ),
      );
      if (already) continue;
      pendingCueCount += 1;
      const key = `cue:${cueMatchKey(title, cue.coverage, cue.targetsPattern)}`;
      if (map.has(key)) continue;
      map.set(key, {
        id: key,
        call: title,
        coverage: cue.coverage,
        targetsPattern: cue.targetsPattern,
        landed: 0,
        missed: 0,
        unmarked: 0,
        sessionCount: 0,
        successRatePct: null,
        source: "timeout-cue",
        gamePlanTitle: plan.title,
        sessionIds: new Set(),
      });
    }
  }

  let totalLanded = 0;
  let totalMissed = 0;
  const rows: CounterSuccessRow[] = [];
  for (const row of map.values()) {
    totalLanded += row.landed;
    totalMissed += row.missed;
    const marked = row.landed + row.missed;
    rows.push({
      id: row.id,
      call: row.call,
      coverage: row.coverage,
      targetsPattern: row.targetsPattern,
      landed: row.landed,
      missed: row.missed,
      unmarked: row.unmarked,
      sessionCount: row.sessionIds.size,
      successRatePct:
        marked > 0 ? Math.round((row.landed / marked) * 100) : null,
      source: row.source,
      gamePlanTitle: row.gamePlanTitle,
    });
  }

  rows.sort((a, b) => {
    const aMarked = a.landed + a.missed;
    const bMarked = b.landed + b.missed;
    if (bMarked !== aMarked) return bMarked - aMarked;
    if ((b.successRatePct ?? -1) !== (a.successRatePct ?? -1)) {
      return (a.successRatePct ?? 999) - (b.successRatePct ?? 999);
    }
    return a.call.localeCompare(b.call);
  });

  const marked = totalLanded + totalMissed;
  const practicedCueCount = rows.filter(
    (row) => row.source === "practice" && row.landed + row.missed > 0,
  ).length;

  return {
    rows: rows.slice(0, maxRows),
    totalLanded,
    totalMissed,
    overallRatePct:
      marked > 0 ? Math.round((totalLanded / marked) * 100) : null,
    practicedCueCount,
    pendingCueCount,
  };
}

export function counterPracticeNotesPrefix() {
  return COUNTER_PRACTICE_NOTES_PREFIX;
}
