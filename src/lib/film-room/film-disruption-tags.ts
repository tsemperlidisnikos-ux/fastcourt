import type { FilmRoomDisruption, FilmRoomDisruptionKind } from "@/types/film-room";

export const FILM_ROOM_DISRUPTION_KINDS: FilmRoomDisruptionKind[] = [
  "hedge",
  "switch",
  "trap",
  "ice",
  "deny",
  "top_lock",
  "help",
  "collapse",
  "drop",
];

export const FILM_ROOM_DISRUPTION_LABELS: Record<FilmRoomDisruptionKind, string> = {
  hedge: "Hedge",
  switch: "Switch",
  trap: "Trap",
  ice: "ICE",
  deny: "Deny",
  top_lock: "Top-lock",
  help: "Help",
  collapse: "Collapse",
  drop: "Drop",
};

/** Keyboard shortcuts in Film Room (when focus not in input). */
export const FILM_DISRUPTION_KEYBOARD_MAP: Record<string, FilmRoomDisruptionKind> = {
  h: "hedge",
  w: "switch",
  t: "trap",
  i: "ice",
  d: "deny",
  k: "top_lock",
  p: "help",
  c: "collapse",
  o: "drop",
};

export const FILM_ANALYZE_DISRUPTION_RADIUS_SEC = 4;
export const FILM_ANALYZE_DISRUPTION_MAX = 8;

export function normalizeFilmDisruptionKind(
  raw: unknown,
): FilmRoomDisruptionKind | null {
  const token = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
  if (token === "toplock") return "top_lock";
  return FILM_ROOM_DISRUPTION_KINDS.includes(token as FilmRoomDisruptionKind)
    ? (token as FilmRoomDisruptionKind)
    : null;
}

export function selectFilmDisruptionsForAnalyze(
  disruptions: FilmRoomDisruption[],
  centerTime: number,
  options?: { radiusSec?: number; max?: number },
): FilmRoomDisruption[] {
  const radius = options?.radiusSec ?? FILM_ANALYZE_DISRUPTION_RADIUS_SEC;
  const max = options?.max ?? FILM_ANALYZE_DISRUPTION_MAX;
  return [...disruptions]
    .filter((row) => Math.abs(row.time - centerTime) <= radius)
    .sort((a, b) => a.time - b.time)
    .slice(0, max);
}

export function formatFilmDisruptionsForPrompt(
  disruptions: FilmRoomDisruption[],
): string {
  if (!disruptions.length) return "";
  const lines = disruptions.map((row) => {
    const label = FILM_ROOM_DISRUPTION_LABELS[row.kind] ?? row.kind;
    const note = row.note?.trim();
    return note
      ? `- ${formatDisruptionTime(row.time)} (${label}): ${note}`
      : `- ${formatDisruptionTime(row.time)} (${label})`;
  });
  return `Coach-tagged defensive disruptions on this clip (the offense plan may have failed here — use for counter/read suggestions):\n${lines.join("\n")}`;
}

export function formatDisruptionTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const sec = Math.floor(seconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function findLastFilmDisruption(
  disruptions: FilmRoomDisruption[],
): FilmRoomDisruption | null {
  if (!disruptions.length) return null;
  return [...disruptions].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export function normalizeFilmAnalyzeDisruptions(raw: unknown): FilmRoomDisruption[] {
  if (!Array.isArray(raw)) return [];
  const out: FilmRoomDisruption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const kind = normalizeFilmDisruptionKind((row as { kind?: unknown }).kind);
    if (!kind) continue;
    const time = Number((row as { time?: unknown }).time);
    if (!Number.isFinite(time) || time < 0) continue;
    const noteRaw = (row as { note?: unknown }).note;
    const note =
      typeof noteRaw === "string" && noteRaw.trim()
        ? noteRaw.trim().slice(0, 200)
        : undefined;
    out.push({
      id:
        typeof (row as { id?: unknown }).id === "string"
          ? (row as { id: string }).id
          : `dis_${out.length}`,
      kind,
      time,
      note,
      createdAt:
        typeof (row as { createdAt?: unknown }).createdAt === "number"
          ? (row as { createdAt: number }).createdAt
          : Date.now(),
    });
    if (out.length >= FILM_ANALYZE_DISRUPTION_MAX) break;
  }
  return out;
}
