import { resolveGamePlanEntryLabel } from "@/lib/game-plan/game-plan-items";
import { pickTopTimeoutCues } from "@/lib/game-plan/game-day-timeout-cues";
import type { GamePlan, GamePlanCategoryId, GamePlanTimeoutCue } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export interface TimeoutSlide {
  play: StoredPlay;
  callLabel: string;
  categoryId: GamePlanCategoryId;
}

export type TimeoutViewSlide =
  | { kind: "counter"; cue: GamePlanTimeoutCue }
  | { kind: "play"; slide: TimeoutSlide };

const TIMEOUT_CATEGORY_PRIORITY: GamePlanCategoryId[] = [
  "ato",
  "blob",
  "slob",
  "special",
];

export function buildTimeoutSlides(
  plan: GamePlan,
  playsById: Map<string, StoredPlay>,
  options?: { categoryIds?: GamePlanCategoryId[] },
): TimeoutSlide[] {
  const allowed = options?.categoryIds?.length
    ? new Set(options.categoryIds)
    : new Set(TIMEOUT_CATEGORY_PRIORITY);

  const priority = new Map(
    TIMEOUT_CATEGORY_PRIORITY.map((id, index) => [id, index]),
  );

  const slides: TimeoutSlide[] = [];
  for (const entry of plan.entries) {
    if (!allowed.has(entry.categoryId)) continue;
    if (!entry.playId) continue;
    const play = playsById.get(entry.playId);
    if (!play?.frames?.length) continue;
    slides.push({
      play,
      callLabel: resolveGamePlanEntryLabel(entry, play),
      categoryId: entry.categoryId,
    });
  }

  return slides.sort((a, b) => {
    const pa = priority.get(a.categoryId) ?? 99;
    const pb = priority.get(b.categoryId) ?? 99;
    if (pa !== pb) return pa - pb;
    return a.callLabel.localeCompare(b.callLabel);
  });
}

export function buildTimeoutViewSlides(
  plan: GamePlan,
  playsById: Map<string, StoredPlay>,
  options?: {
    categoryIds?: GamePlanCategoryId[];
    maxCounters?: number;
  },
): TimeoutViewSlide[] {
  const counterSlides: TimeoutViewSlide[] = pickTopTimeoutCues(
    plan.timeoutCues,
    options?.maxCounters ?? 3,
  ).map((cue) => ({ kind: "counter", cue }));

  const playSlides: TimeoutViewSlide[] = buildTimeoutSlides(
    plan,
    playsById,
    options,
  ).map((slide) => ({ kind: "play", slide }));

  return [...counterSlides, ...playSlides];
}

export const DEFAULT_TIMEOUT_SECONDS = 30;
