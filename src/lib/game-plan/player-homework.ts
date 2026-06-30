import { computePrepPracticeDate } from "@/lib/game-plan/prep-practice";
import type { GamePlan, PlayerHomeworkAssignment } from "@/types/library-meta";

export function newPlayerHomeworkId() {
  return `hw_${crypto.randomUUID()}`;
}

export function normalizePlayerHomework(
  raw: PlayerHomeworkAssignment,
): PlayerHomeworkAssignment {
  const playerStatus: PlayerHomeworkAssignment["playerStatus"] = {};
  if (raw.playerStatus && typeof raw.playerStatus === "object") {
    for (const [playerId, status] of Object.entries(raw.playerStatus)) {
      if (!playerId.trim() || !status) continue;
      playerStatus[playerId] = {
        studied: !!status.studied,
        studiedAt: status.studiedAt || undefined,
        openedAt: status.openedAt || undefined,
        source:
          status.source === "coach" || status.source === "player"
            ? status.source
            : undefined,
      };
    }
  }
  return {
    ...raw,
    title: raw.title?.trim() || "Homework",
    opponent: raw.opponent?.trim() || "",
    gameDate: raw.gameDate || "",
    dueDate: raw.dueDate || raw.gameDate || "",
    team: raw.team?.trim() || "No Team",
    notes: raw.notes?.trim() || undefined,
    playIds: Array.isArray(raw.playIds)
      ? [...new Set(raw.playIds.filter(Boolean))]
      : [],
    playerTokens:
      raw.playerTokens && typeof raw.playerTokens === "object"
        ? Object.fromEntries(
            Object.entries(raw.playerTokens).filter(
              ([id, token]) => id.trim() && String(token || "").trim(),
            ),
          )
        : undefined,
    playerStatus,
    status: raw.status === "closed" ? "closed" : "open",
  };
}

export function buildHomeworkFromGamePlan(
  plan: GamePlan,
  options: { dueDate?: string; notes?: string; now?: string } = {},
): PlayerHomeworkAssignment {
  const now = options.now || new Date().toISOString();
  const playIds = [
    ...new Set(
      plan.entries.map((entry) => entry.playId).filter(Boolean) as string[],
    ),
  ];
  return normalizePlayerHomework({
    id: newPlayerHomeworkId(),
    gamePlanId: plan.id,
    title: `Homework: ${plan.title}`,
    opponent: plan.opponent,
    gameDate: plan.gameDate,
    dueDate: options.dueDate || computePrepPracticeDate(plan.gameDate),
    team: plan.team,
    notes:
      options.notes?.trim() ||
      `Study these plays before ${plan.gameDate || "game day"}.`,
    playIds,
    playerTokens: {},
    playerStatus: {},
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
}

export function homeworkOpenedCount(assignment: PlayerHomeworkAssignment) {
  return Object.values(assignment.playerStatus).filter((row) => row.openedAt).length;
}

export function homeworkStudiedCount(assignment: PlayerHomeworkAssignment) {
  return Object.values(assignment.playerStatus).filter((row) => row.studied).length;
}

export function homeworkForGamePlan(
  assignments: PlayerHomeworkAssignment[],
  gamePlanId: string,
) {
  return assignments
    .filter((row) => row.gamePlanId === gamePlanId)
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export function formatHomeworkDueDate(date: string) {
  if (!date) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const parsed = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(date);
  if (!Number.isFinite(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
