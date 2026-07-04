import {
  groupGamePlanEntries,
  resolveGamePlanEntryLabel,
} from "@/lib/game-plan/game-plan-items";
import {
  defaultPracticeItemDuration,
  newPracticeItemId,
  normalizePracticeSession,
} from "@/lib/practice/practice-items";
import type { GamePlan, PracticeSession } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

function formatLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computePrepPracticeDate(gameDate: string, today = new Date()) {
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(gameDate.trim());
  const gameStart = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(gameDate);
  if (!Number.isFinite(gameStart.getTime())) {
    return formatLocalIsoDate(todayStart);
  }
  const gameDay = new Date(
    gameStart.getFullYear(),
    gameStart.getMonth(),
    gameStart.getDate(),
  );
  const diffDays = Math.round(
    (gameDay.getTime() - todayStart.getTime()) / 86_400_000,
  );
  if (diffDays <= 1) {
    return formatLocalIsoDate(todayStart);
  }
  const prep = new Date(gameDay);
  prep.setDate(prep.getDate() - 1);
  return formatLocalIsoDate(prep);
}

export function buildPracticeSessionFromGamePlan(
  plan: GamePlan,
  plays: StoredPlay[],
  options: { sessionId?: string; now?: string } = {},
): PracticeSession {
  const now = options.now || new Date().toISOString();
  const playById = new Map(plays.map((play) => [play.id, play]));
  const items = groupGamePlanEntries(plan.entries).flatMap((group) =>
    group.entries.flatMap((entry) => {
      if (!entry.playId) return [];
      const play = playById.get(entry.playId);
      if (!play) return [];
      const label = resolveGamePlanEntryLabel(entry, play);
      return [
        {
          id: newPracticeItemId(),
          playId: entry.playId,
          cueLabel: `${group.label}: ${label}`,
          durationMin: defaultPracticeItemDuration(play),
          notes: entry.notes || "",
        },
      ];
    }),
  );

  return normalizePracticeSession({
    id: options.sessionId || `prac_${crypto.randomUUID()}`,
    date: computePrepPracticeDate(plan.gameDate),
    title: `Prep: vs ${plan.opponent || plan.title}`,
    team: plan.team,
    notes:
      plan.scoutingNotes?.trim() ||
      `Walk-through plays before ${plan.gameDate || "game day"}.`,
    items,
    createdAt: now,
    updatedAt: now,
  });
}
