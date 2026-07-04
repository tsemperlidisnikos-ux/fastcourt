import { gamePlanCategoryLabel, GAME_PLAN_CATEGORIES } from "@/lib/game-plan/constants";
import type {
  GamePlan,
  GamePlanCategoryId,
  GamePlanEntry,
  GamePlanStatus,
} from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import { normalizeOpponentTendencies } from "@/lib/game-plan/opponent-board";
import { normalizeTimeoutCues } from "@/lib/game-plan/game-day-timeout-cues";

export function newGamePlanEntryId() {
  return `gpe_${crypto.randomUUID()}`;
}

export function newGamePlanId() {
  return `gp_${crypto.randomUUID()}`;
}

export function normalizeGamePlan(raw: GamePlan): GamePlan {
  return {
    ...raw,
    title: raw.title?.trim() || `vs ${raw.opponent || "Opponent"}`,
    opponent: raw.opponent?.trim() || "Opponent",
    gameDate: raw.gameDate || new Date().toISOString().slice(0, 10),
    team: raw.team?.trim() || "No Team",
    location: raw.location?.trim() || undefined,
    scoutingNotes: raw.scoutingNotes?.trim() || undefined,
    postGameNotes: raw.postGameNotes?.trim() || undefined,
    entries: Array.isArray(raw.entries)
      ? raw.entries.map((entry) => ({
          ...entry,
          label: entry.label?.trim() || undefined,
          callName: entry.callName?.trim() || undefined,
          playId: entry.playId?.trim() || undefined,
          notes: entry.notes?.trim() || undefined,
        }))
      : [],
    opponentBoard: normalizeOpponentTendencies(raw.opponentBoard),
    timeoutCues: normalizeTimeoutCues(raw.timeoutCues),
    status: raw.status === "ready" || raw.status === "archived" ? raw.status : "draft",
  };
}

export function createGamePlanDraft(opponent: string, team: string): GamePlan {
  const now = new Date().toISOString();
  const trimmedOpponent = opponent.trim() || "Opponent";
  return normalizeGamePlan({
    id: newGamePlanId(),
    title: `vs ${trimmedOpponent}`,
    opponent: trimmedOpponent,
    gameDate: now.slice(0, 10),
    team: team.trim() || "No Team",
    entries: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
}

export function duplicateGamePlan(source: GamePlan): GamePlan {
  const now = new Date().toISOString();
  return normalizeGamePlan({
    ...source,
    id: newGamePlanId(),
    title: `${source.title} (copy)`,
    status: "draft",
    entries: source.entries.map((entry) => ({
      ...entry,
      id: newGamePlanEntryId(),
    })),
    createdAt: now,
    updatedAt: now,
  });
}

export function gamePlanEntryCount(plan: GamePlan) {
  return plan.entries.filter((entry) => entry.playId).length;
}

export function isGamePlanUpcoming(plan: GamePlan, today = new Date()) {
  if (plan.status === "archived") return false;
  const ms = new Date(plan.gameDate).getTime();
  if (!Number.isFinite(ms)) return true;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const gameDay = new Date(ms);
  const gameDayStart = new Date(
    gameDay.getFullYear(),
    gameDay.getMonth(),
    gameDay.getDate(),
  ).getTime();
  return gameDayStart >= day;
}

export function sortGamePlans(plans: GamePlan[]) {
  return [...plans].sort((a, b) => {
    const aUp = isGamePlanUpcoming(a);
    const bUp = isGamePlanUpcoming(b);
    if (aUp !== bUp) return aUp ? -1 : 1;
    const aMs = new Date(a.gameDate).getTime();
    const bMs = new Date(b.gameDate).getTime();
    if (aUp) return aMs - bMs;
    return bMs - aMs;
  });
}

export function groupGamePlanEntries(entries: GamePlanEntry[]) {
  const groups = new Map<GamePlanCategoryId, GamePlanEntry[]>();
  for (const category of GAME_PLAN_CATEGORIES) {
    groups.set(category.id, []);
  }
  groups.set("custom", []);
  for (const entry of entries) {
    const bucket = groups.get(entry.categoryId) ?? groups.get("custom")!;
    bucket.push(entry);
  }
  const rows = GAME_PLAN_CATEGORIES.map((category) => ({
    categoryId: category.id,
    label: category.label,
    entries: groups.get(category.id) ?? [],
  }));
  const custom = groups.get("custom") ?? [];
  if (custom.length) {
    rows.push({ categoryId: "custom", label: "Custom", entries: custom });
  }
  return rows;
}

export function resolveGamePlanEntryLabel(
  entry: GamePlanEntry,
  play?: StoredPlay | null,
) {
  return (
    entry.callName?.trim() ||
    play?.title?.trim() ||
    entry.label?.trim() ||
    "Untitled"
  );
}

export function formatGamePlanDate(date: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatGamePlanHomeAway(homeAway?: GamePlan["homeAway"]) {
  if (homeAway === "home") return "Home";
  if (homeAway === "away") return "Away";
  if (homeAway === "neutral") return "Neutral";
  return "";
}

export function gamePlanStatusLabel(status: GamePlanStatus) {
  if (status === "ready") return "Ready";
  if (status === "archived") return "Archived";
  return "Draft";
}

export function resolveGamePlanPlays(
  plan: GamePlan,
  plays: StoredPlay[],
): Map<string, StoredPlay> {
  const byId = new Map(plays.map((play) => [play.id, play]));
  const out = new Map<string, StoredPlay>();
  for (const entry of plan.entries) {
    if (!entry.playId) continue;
    const play = byId.get(entry.playId);
    if (play) out.set(entry.id, play);
  }
  return out;
}

export function benchCategoriesForPrint(plan: GamePlan) {
  return groupGamePlanEntries(plan.entries)
    .map((group) => ({
      ...group,
      label: gamePlanCategoryLabel(group.categoryId, group.label),
      rows: group.entries,
    }))
    .filter((group) => group.rows.length > 0);
}
