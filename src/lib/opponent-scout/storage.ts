import type {
  OpponentScoutPlayer,
  OpponentScoutReport,
  OpponentScoutStats,
} from "@/types/opponent-scout";
import { EMPTY_OPPONENT_SCOUT_STATS } from "@/types/opponent-scout";

const STORAGE_KEY = "fastcourt_opponent_scout_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeStats(raw: unknown): OpponentScoutStats {
  const stats = { ...EMPTY_OPPONENT_SCOUT_STATS };
  if (!raw || typeof raw !== "object") return stats;
  const record = raw as Record<string, unknown>;
  for (const key of Object.keys(stats) as (keyof OpponentScoutStats)[]) {
    if (typeof record[key] === "string" || typeof record[key] === "number") {
      stats[key] = String(record[key]);
    }
  }
  return stats;
}

function normalizeLines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line) => String(line ?? "").trim())
    .filter(Boolean);
}

function normalizePlayer(raw: unknown): OpponentScoutPlayer | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" && record.id.trim() ? record.id : newId("osp");
  const name = typeof record.name === "string" ? record.name.trim() : "";
  return {
    id,
    jersey: typeof record.jersey === "string" ? record.jersey.trim() : "",
    name,
    position: typeof record.position === "string" ? record.position.trim() : "",
    height: typeof record.height === "string" ? record.height.trim() : "",
    photoDataUrl:
      typeof record.photoDataUrl === "string" ? record.photoDataUrl : "",
    stats: normalizeStats(record.stats),
    strengths: normalizeLines(record.strengths),
    weaknesses: normalizeLines(record.weaknesses),
  };
}

function normalizeReport(raw: unknown): OpponentScoutReport | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" && record.id.trim() ? record.id : newId("osr");
  const now = new Date().toISOString();
  const players = Array.isArray(record.players)
    ? record.players
        .map(normalizePlayer)
        .filter((player): player is OpponentScoutPlayer => Boolean(player))
    : [];

  return {
    id,
    teamName: typeof record.teamName === "string" ? record.teamName.trim() : "",
    gameDate: typeof record.gameDate === "string" ? record.gameDate.trim() : "",
    teamLogoDataUrl:
      typeof record.teamLogoDataUrl === "string" ? record.teamLogoDataUrl : "",
    players,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
  };
}

export function createEmptyOpponentScoutPlayer(): OpponentScoutPlayer {
  return {
    id: newId("osp"),
    jersey: "",
    name: "",
    position: "",
    height: "",
    photoDataUrl: "",
    stats: { ...EMPTY_OPPONENT_SCOUT_STATS },
    strengths: [],
    weaknesses: [],
  };
}

export function createEmptyOpponentScoutReport(): OpponentScoutReport {
  const now = new Date().toISOString();
  return {
    id: newId("osr"),
    teamName: "",
    gameDate: "",
    teamLogoDataUrl: "",
    players: [createEmptyOpponentScoutPlayer()],
    createdAt: now,
    updatedAt: now,
  };
}

export function loadOpponentScoutReports(): OpponentScoutReport[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeReport)
      .filter((report): report is OpponentScoutReport => Boolean(report))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function persist(reports: OpponentScoutReport[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (
      (error instanceof DOMException &&
        (error.name === "QuotaExceededError" || error.code === 22)) ||
      /quota|QuotaExceeded/i.test(message)
    ) {
      throw new Error(
        "Not enough browser storage. Use smaller photos or delete old scout reports.",
      );
    }
    throw error instanceof Error
      ? error
      : new Error(message || "Could not save scout report.");
  }
}

export function saveOpponentScoutReport(
  report: OpponentScoutReport,
): OpponentScoutReport {
  const next: OpponentScoutReport = {
    ...report,
    teamName: report.teamName.trim(),
    gameDate: report.gameDate.trim(),
    players: report.players.map((player) => ({
      ...player,
      jersey: player.jersey.trim(),
      name: player.name.trim(),
      position: player.position.trim(),
      height: player.height.trim(),
      strengths: player.strengths.map((line) => line.trim()).filter(Boolean),
      weaknesses: player.weaknesses.map((line) => line.trim()).filter(Boolean),
      stats: { ...player.stats },
    })),
    updatedAt: new Date().toISOString(),
  };

  const all = loadOpponentScoutReports();
  const index = all.findIndex((row) => row.id === next.id);
  if (index >= 0) {
    all[index] = { ...next, createdAt: all[index]!.createdAt };
  } else {
    all.unshift(next);
  }
  persist(all);
  return index >= 0 ? all[index]! : next;
}

export function duplicateOpponentScoutReport(
  report: OpponentScoutReport,
): OpponentScoutReport {
  const now = new Date().toISOString();
  const copy: OpponentScoutReport = {
    ...structuredClone(report),
    id: newId("osr"),
    teamName: report.teamName.trim()
      ? `${report.teamName.trim()} (copy)`
      : "Untitled opponent (copy)",
    players: report.players.map((player) => ({
      ...player,
      id: newId("osp"),
    })),
    createdAt: now,
    updatedAt: now,
  };
  return saveOpponentScoutReport(copy);
}

export function deleteOpponentScoutReport(id: string): void {
  persist(loadOpponentScoutReports().filter((row) => row.id !== id));
}

export function getOpponentScoutReport(
  id: string,
): OpponentScoutReport | null {
  return loadOpponentScoutReports().find((row) => row.id === id) ?? null;
}

export function opponentScoutReportLabel(report: OpponentScoutReport): string {
  const team = report.teamName.trim() || "Untitled opponent";
  const date = report.gameDate.trim();
  return date ? `${team} — ${date}` : team;
}
