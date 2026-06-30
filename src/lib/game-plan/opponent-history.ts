import { newGamePlanEntryId, newGamePlanId, normalizeGamePlan } from "@/lib/game-plan/game-plan-items";
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

export function createRematchGamePlan(source: GamePlan, gameDate: string): GamePlan {
  const now = new Date().toISOString();
  return normalizeGamePlan({
    ...source,
    id: newGamePlanId(),
    title: `vs ${source.opponent}`,
    gameDate: gameDate.trim() || now.slice(0, 10),
    entries: source.entries.map((entry) => ({
      ...entry,
      id: newGamePlanEntryId(),
    })),
    status: "draft",
    postGameNotes: undefined,
    createdAt: now,
    updatedAt: now,
  });
}
