import type { DisruptionPracticeEntry } from "@/lib/film-room/film-practice-disruption";
import {
  buildHomeworkFromGamePlan,
  newPlayerHomeworkId,
  normalizePlayerHomework,
} from "@/lib/game-plan/player-homework";
import type {
  GamePlan,
  PlayerHomeworkAssignment,
  PlayerHomeworkReadItem,
} from "@/types/library-meta";

export function homeworkReadSignature(item: PlayerHomeworkReadItem) {
  const frame =
    typeof item.frameIndex === "number" && Number.isFinite(item.frameIndex)
      ? Math.floor(item.frameIndex)
      : 0;
  return `${item.playId}|${frame}`;
}

export function normalizeHomeworkReadItems(
  raw: PlayerHomeworkReadItem[] | undefined,
): PlayerHomeworkReadItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: PlayerHomeworkReadItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const playId = row.playId?.trim();
    if (!playId) continue;
    const frameIndex =
      typeof row.frameIndex === "number" &&
      Number.isFinite(row.frameIndex) &&
      row.frameIndex >= 0
        ? Math.floor(row.frameIndex)
        : undefined;
    const item: PlayerHomeworkReadItem = {
      playId,
      frameIndex,
      liveCall: row.liveCall?.trim()?.slice(0, 80) || undefined,
      notes: row.notes?.trim()?.slice(0, 240) || undefined,
      filmSessionId: row.filmSessionId?.trim() || undefined,
      filmTimestamp:
        typeof row.filmTimestamp === "number" &&
        Number.isFinite(row.filmTimestamp) &&
        row.filmTimestamp >= 0
          ? row.filmTimestamp
          : undefined,
    };
    const signature = homeworkReadSignature(item);
    if (seen.has(signature)) continue;
    seen.add(signature);
    items.push(item);
  }
  return items;
}

export function buildHomeworkReadItemsFromEntries(
  entries: DisruptionPracticeEntry[],
  film?: { sessionId?: string; timestamp?: number },
): PlayerHomeworkReadItem[] {
  return normalizeHomeworkReadItems(
    entries.map((entry) => ({
      playId: entry.playId,
      frameIndex: entry.designerFrameIndex,
      liveCall: entry.liveCall,
      notes: entry.notes,
      filmSessionId: film?.sessionId,
      filmTimestamp: film?.timestamp,
    })),
  );
}

export function mergeHomeworkReadItems(
  existing: PlayerHomeworkReadItem[] | undefined,
  incoming: PlayerHomeworkReadItem[],
): PlayerHomeworkReadItem[] {
  return normalizeHomeworkReadItems([...(existing ?? []), ...incoming]);
}

export function buildDisruptionHomeworkFromPlan(
  plan: GamePlan,
  readItems: PlayerHomeworkReadItem[],
  sessionTitle?: string,
): PlayerHomeworkAssignment {
  const normalizedReads = normalizeHomeworkReadItems(readItems);
  const readPlayIds = normalizedReads.map((row) => row.playId);
  const base = buildHomeworkFromGamePlan(plan, {
    notes: `Study these film reads before ${plan.gameDate || "game day"}.`,
  });
  const filmTitle = sessionTitle?.trim() || plan.opponent || "Film reads";
  return normalizePlayerHomework({
    ...base,
    id: newPlayerHomeworkId(),
    title: `Reads — ${filmTitle}`.slice(0, 80),
    playIds: [...new Set([...base.playIds, ...readPlayIds])],
    readItems: normalizedReads,
  });
}

export function disruptionHomeworkSessionTitle(sessionTitle: string) {
  return `Reads — ${sessionTitle.trim() || "Film clip"}`.slice(0, 80);
}

export function countNewHomeworkReads(
  existing: PlayerHomeworkReadItem[] | undefined,
  incoming: PlayerHomeworkReadItem[],
): number {
  const seen = new Set((existing ?? []).map(homeworkReadSignature));
  let added = 0;
  for (const row of normalizeHomeworkReadItems(incoming)) {
    const signature = homeworkReadSignature(row);
    if (seen.has(signature)) continue;
    seen.add(signature);
    added += 1;
  }
  return added;
}
