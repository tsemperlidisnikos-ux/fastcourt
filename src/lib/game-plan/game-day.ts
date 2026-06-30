import { gamePlanCategoryLabel } from "@/lib/game-plan/constants";
import { resolveGamePlanEntryLabel, groupGamePlanEntries } from "@/lib/game-plan/game-plan-items";
import type { ShareGamePlanEntry } from "@/lib/share/share-link";
import type { GamePlan, GamePlanCategoryId } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export const GAMEDAY_SYNC_CHANNEL = "fc_gameday_sync_v1";

export interface GameDaySyncState {
  planId: string;
  activeCategoryId: GamePlanCategoryId;
  updatedAt: string;
}

export interface GameDayCallRow {
  id: string;
  name: string;
  notes?: string;
}

export interface GameDayCategoryGroup {
  categoryId: GamePlanCategoryId;
  label: string;
  calls: GameDayCallRow[];
}

export function gameDayStorageKey(planId: string) {
  return `fc_gameday_v1_${planId}`;
}

export function readGameDayState(planId: string): GameDaySyncState | null {
  if (typeof window === "undefined" || !planId) return null;
  try {
    const raw = localStorage.getItem(gameDayStorageKey(planId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameDaySyncState;
    if (parsed?.planId !== planId || !parsed.activeCategoryId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGameDayState(state: GameDaySyncState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(gameDayStorageKey(state.planId), JSON.stringify(state));
  try {
    const channel = new BroadcastChannel(GAMEDAY_SYNC_CHANNEL);
    channel.postMessage(state);
    channel.close();
  } catch {
    // BroadcastChannel unavailable
  }
}

export function subscribeGameDayState(
  planId: string,
  onChange: (state: GameDaySyncState | null) => void,
) {
  if (typeof window === "undefined" || !planId) return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== gameDayStorageKey(planId)) return;
    onChange(readGameDayState(planId));
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(GAMEDAY_SYNC_CHANNEL);
    channel.onmessage = (event: MessageEvent<GameDaySyncState>) => {
      if (event.data?.planId === planId) onChange(event.data);
    };
  } catch {
    // ignore
  }

  window.addEventListener("storage", onStorage);
  onChange(readGameDayState(planId));

  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}

export function buildGameDayCategories(
  plan: GamePlan,
  plays: StoredPlay[],
): GameDayCategoryGroup[] {
  const playById = new Map(plays.map((play) => [play.id, play]));
  return groupGamePlanEntries(plan.entries)
    .filter((group) => group.entries.some((entry) => entry.playId))
    .map((group) => ({
      categoryId: group.categoryId,
      label:
        group.categoryId === "custom"
          ? group.label
          : gamePlanCategoryLabel(group.categoryId, group.label),
      calls: group.entries
        .filter((entry) => entry.playId)
        .map((entry) => ({
          id: entry.id,
          name: resolveGamePlanEntryLabel(entry, playById.get(entry.playId!)),
          notes: entry.notes?.trim() || undefined,
        })),
    }));
}

export function buildGameDayCategoriesFromShareEntries(
  entries: ShareGamePlanEntry[],
): GameDayCategoryGroup[] {
  const map = new Map<string, GameDayCategoryGroup>();
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!;
    const label =
      entry.categoryLabel?.trim() ||
      gamePlanCategoryLabel(entry.categoryId, entry.categoryLabel);
    const key = `${entry.categoryId}:${label}`;
    const group = map.get(key) || {
      categoryId: entry.categoryId,
      label,
      calls: [],
    };
    group.calls.push({
      id: `share_${index}`,
      name:
        entry.callName?.trim() ||
        entry.play?.title?.trim() ||
        `Play ${index + 1}`,
      notes: entry.notes?.trim() || undefined,
    });
    map.set(key, group);
  }
  return [...map.values()];
}

export function resolveGameDayCategoryIndex(
  categories: GameDayCategoryGroup[],
  categoryId?: GamePlanCategoryId | null,
) {
  if (!categories.length) return 0;
  if (!categoryId) return 0;
  const index = categories.findIndex((row) => row.categoryId === categoryId);
  return index >= 0 ? index : 0;
}

export function mergeGameDayCategoryId(
  plan: GamePlan,
  categories: GameDayCategoryGroup[],
): GamePlanCategoryId | undefined {
  const fromPlan = plan.gameDay?.activeCategoryId;
  const fromStorage = readGameDayState(plan.id)?.activeCategoryId;
  const candidate = fromStorage || fromPlan;
  if (!candidate) return categories[0]?.categoryId;
  return categories.some((row) => row.categoryId === candidate)
    ? candidate
    : categories[0]?.categoryId;
}
