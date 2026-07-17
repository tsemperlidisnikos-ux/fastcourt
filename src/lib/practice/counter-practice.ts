import { COUNTER_COVERAGE_LABELS } from "@/lib/film-room/film-counter-playbook";
import type { FilmClipCounterSuggestion } from "@/lib/film-room/film-clip-analyze-types";
import { newPracticeItemId } from "@/lib/practice/practice-items";
import type {
  GamePlan,
  PracticeSession,
  PracticeSessionItem,
} from "@/types/library-meta";

export const COUNTER_PRACTICE_NOTES_PREFIX = "Counter drill —";
export const COUNTER_PRACTICE_DEFAULT_BLOCKS = 2;

export function formatCounterPracticeCall(
  counter: FilmClipCounterSuggestion,
): string {
  const coverage = COUNTER_COVERAGE_LABELS[counter.coverage];
  const vs = counter.targetsPattern ? ` vs ${counter.targetsPattern}` : "";
  return `${counter.title} (${coverage})${vs}`;
}

export function createCounterPracticeItems(
  counter: FilmClipCounterSuggestion,
  options?: { playId?: string; blocks?: number },
): PracticeSessionItem[] {
  const blocks = Math.max(
    1,
    Math.min(4, options?.blocks ?? COUNTER_PRACTICE_DEFAULT_BLOCKS),
  );
  const call = formatCounterPracticeCall(counter);
  const notesParts = [
    `${COUNTER_PRACTICE_NOTES_PREFIX}${counter.title}`,
    COUNTER_COVERAGE_LABELS[counter.coverage],
  ];
  if (counter.targetsPattern) notesParts.push(`vs ${counter.targetsPattern}`);
  if (counter.trigger) notesParts.push(`Trigger: ${counter.trigger}`);
  const notes = `${notesParts.join(" · ")}.`;

  return Array.from({ length: blocks }, () => ({
    id: newPracticeItemId(),
    playId: options?.playId,
    cueLabel: options?.playId ? undefined : call,
    liveCall: call,
    durationMin: 10,
    notes,
  }));
}

export function isCounterPracticeItem(item: PracticeSessionItem): boolean {
  if (item.notes?.trim().startsWith(COUNTER_PRACTICE_NOTES_PREFIX)) return true;
  // Fallback for calls shaped like "ICE side PNR (ICE …) vs PNR"
  const call = item.liveCall?.trim() ?? "";
  return /\([^)]+\)\s*vs\s+/i.test(call);
}

export function findCounterPracticeSession(
  plan: GamePlan,
  sessions: PracticeSession[],
): PracticeSession | null {
  const opponentToken = plan.opponent.trim().toLowerCase();
  const teamSessions = sessions.filter((session) => session.team === plan.team);
  if (!teamSessions.length) return null;

  const counterSession = teamSessions.find((session) => {
    const title = session.title.toLowerCase();
    const notes = session.notes?.toLowerCase() ?? "";
    return (
      title.includes("counter") ||
      notes.includes("counter") ||
      (opponentToken && title.includes(opponentToken) && title.includes("def"))
    );
  });
  if (counterSession) return counterSession;

  return (
    [...teamSessions].sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )[0] ?? null
  );
}

export function counterPracticeSessionTitle(plan: GamePlan) {
  return `Counters vs ${plan.opponent}`;
}
