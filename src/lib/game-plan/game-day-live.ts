import { createClient } from "@/lib/supabase/client";
import type { GamePlan, GamePlanCategoryId } from "@/types/library-meta";

export const GAMEDAY_LIVE_POLL_MS = 2000;

export interface GameDayLiveState {
  activeCategoryId: GamePlanCategoryId;
  updatedAt: string;
}

export function createGameDaySyncToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `gd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureGameDaySyncToken(plan: GamePlan): string {
  return plan.gameDay?.syncToken?.trim() || createGameDaySyncToken();
}

export function buildGameDayPatch(
  plan: GamePlan,
  activeCategoryId?: GamePlanCategoryId,
  syncToken?: string,
): NonNullable<GamePlan["gameDay"]> {
  const token = syncToken || ensureGameDaySyncToken(plan);
  const now = new Date().toISOString();
  return {
    ...plan.gameDay,
    syncToken: token,
    activeCategoryId:
      activeCategoryId ?? plan.gameDay?.activeCategoryId,
    updatedAt: now,
  };
}

function parseLiveRpc(data: unknown): GameDayLiveState | null {
  if (!data || typeof data !== "object") return null;
  const row = data as { ok?: boolean; activeCategoryId?: string; updatedAt?: string };
  if (!row.ok || !row.activeCategoryId || !row.updatedAt) return null;
  return {
    activeCategoryId: row.activeCategoryId as GamePlanCategoryId,
    updatedAt: row.updatedAt,
  };
}

export async function publishGameDayLiveCategory(
  planId: string,
  syncToken: string,
  activeCategoryId: GamePlanCategoryId,
): Promise<GameDayLiveState | null> {
  const supabase = createClient();
  if (!supabase || !planId || !syncToken) return null;

  const { data, error } = await supabase.rpc("set_game_day_live", {
    p_plan_id: planId,
    p_sync_token: syncToken,
    p_active_category_id: activeCategoryId,
  });

  if (error) {
    console.warn("FastCourt: set_game_day_live failed", error.message);
    return null;
  }

  return parseLiveRpc(data);
}

export async function fetchGameDayLiveCategory(
  planId: string,
  syncToken: string,
): Promise<GameDayLiveState | null> {
  const supabase = createClient();
  if (!supabase || !planId || !syncToken) return null;

  const { data, error } = await supabase.rpc("get_game_day_live", {
    p_plan_id: planId,
    p_sync_token: syncToken,
  });

  if (error) {
    console.warn("FastCourt: get_game_day_live failed", error.message);
    return null;
  }

  return parseLiveRpc(data);
}

export function subscribeGameDayLivePoll(
  planId: string,
  syncToken: string,
  onChange: (state: GameDayLiveState) => void,
  intervalMs = GAMEDAY_LIVE_POLL_MS,
) {
  if (!planId || !syncToken) return () => {};

  let active = true;
  let lastUpdatedAt = "";

  const tick = async () => {
    if (!active) return;
    const state = await fetchGameDayLiveCategory(planId, syncToken);
    if (!active || !state) return;
    if (state.updatedAt === lastUpdatedAt) return;
    lastUpdatedAt = state.updatedAt;
    onChange(state);
  };

  void tick();
  const timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    active = false;
    window.clearInterval(timer);
  };
}
