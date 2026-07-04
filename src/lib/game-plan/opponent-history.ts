import {
  formatGamePlanDate,
  newGamePlanEntryId,
  newGamePlanId,
  normalizeGamePlan,
} from "@/lib/game-plan/game-plan-items";
import {
  cloneOpponentBoard,
  mergeOpponentBoards,
  mergeScoutingNotes,
} from "@/lib/game-plan/opponent-board";
import type { GamePlan } from "@/types/library-meta";

export function normalizeOpponentKey(opponent: string) {
  return opponent.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findOpponentHistory(
  plans: GamePlan[],
  opponent: string,
  options: { excludeId?: string; limit?: number } = {},
): GamePlan[] {
  const key = normalizeOpponentKey(opponent);
  if (!key) return [];
  const limit = options.limit ?? 3;
  return plans
    .filter(
      (plan) =>
        plan.id !== options.excludeId && normalizeOpponentKey(plan.opponent) === key,
    )
    .sort(
      (a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime(),
    )
    .slice(0, limit);
}

export function scoutNotesFromPreviousPlan(
  source: GamePlan,
  gameDateLabel?: string,
): string | undefined {
  const parts: string[] = [];
  const keys = source.scoutingNotes?.trim();
  if (keys) parts.push(keys);

  const postGame = source.postGameNotes?.trim();
  if (postGame) {
    const label = gameDateLabel?.trim() || source.gameDate;
    parts.push(`Post-game (${label}): ${postGame}`);
  }

  if (!parts.length) return undefined;
  return parts.join("\n\n");
}

export function importScoutFromPreviousPlan(
  target: GamePlan,
  source: GamePlan,
  gameDateLabel?: string,
): Pick<GamePlan, "opponentBoard" | "scoutingNotes"> {
  return {
    opponentBoard: mergeOpponentBoards(target.opponentBoard, source.opponentBoard),
    scoutingNotes: mergeScoutingNotes(
      target.scoutingNotes,
      scoutNotesFromPreviousPlan(source, gameDateLabel),
    ),
  };
}

export function createRematchGamePlan(source: GamePlan, gameDate: string): GamePlan {
  const now = new Date().toISOString();
  const rematchScout = scoutNotesFromPreviousPlan(source);
  return normalizeGamePlan({
    ...source,
    id: newGamePlanId(),
    title: `vs ${source.opponent}`,
    gameDate: gameDate.trim() || now.slice(0, 10),
    entries: source.entries.map((entry) => ({
      ...entry,
      id: newGamePlanEntryId(),
    })),
    opponentBoard: cloneOpponentBoard(source.opponentBoard),
    scoutingNotes: mergeScoutingNotes(
      source.scoutingNotes,
      source.postGameNotes?.trim()
        ? `Post-game (${formatGamePlanDate(source.gameDate)}): ${source.postGameNotes.trim()}`
        : undefined,
    ),
    status: "draft",
    postGameNotes: undefined,
    createdAt: now,
    updatedAt: now,
  });
}
