import type { FilmRoomEvent, FilmRoomEventKind } from "@/types/film-room";

export const FILM_ROOM_EVENT_KINDS: FilmRoomEventKind[] = [
  "pnr",
  "handoff",
  "cut",
  "screen",
  "iso",
  "flare",
  "transition",
];

export const FILM_ROOM_EVENT_LABELS: Record<FilmRoomEventKind, string> = {
  pnr: "PnR",
  handoff: "Handoff",
  cut: "Cut",
  screen: "Screen",
  iso: "ISO",
  flare: "Flare",
  transition: "Transition",
};

export const FILM_EVENT_KEYBOARD_MAP: Record<string, FilmRoomEventKind> = {
  "1": "pnr",
  "2": "handoff",
  "3": "cut",
  "4": "screen",
  "5": "iso",
  "6": "flare",
  "7": "transition",
};

/** Events within this radius (seconds) of the analyze playhead are sent to AI. */
export const FILM_ANALYZE_EVENT_RADIUS_SEC = 4;

export const FILM_ANALYZE_EVENT_MAX = 12;

export function normalizeFilmEventKind(raw: unknown): FilmRoomEventKind | null {
  const token = String(raw ?? "")
    .trim()
    .toLowerCase();
  return FILM_ROOM_EVENT_KINDS.includes(token as FilmRoomEventKind)
    ? (token as FilmRoomEventKind)
    : null;
}

export function formatFilmEventTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const sec = Math.floor(seconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function selectFilmEventsForAnalyze(
  events: FilmRoomEvent[],
  centerTime: number,
  options?: { radiusSec?: number; max?: number },
): FilmRoomEvent[] {
  const radius = options?.radiusSec ?? FILM_ANALYZE_EVENT_RADIUS_SEC;
  const max = options?.max ?? FILM_ANALYZE_EVENT_MAX;
  return [...events]
    .filter((event) => Math.abs(event.time - centerTime) <= radius)
    .sort((a, b) => a.time - b.time)
    .slice(0, max);
}

export function formatFilmEventsForPrompt(events: FilmRoomEvent[]): string {
  if (!events.length) return "";
  const lines = events.map((event) => {
    const label = FILM_ROOM_EVENT_LABELS[event.kind] ?? event.kind;
    const note = event.note?.trim();
    return note
      ? `- ${formatFilmEventTime(event.time)} (${label}): ${note}`
      : `- ${formatFilmEventTime(event.time)} (${label})`;
  });
  return `Coach-tagged events on this clip (use these as ground truth when they match the frames):\n${lines.join("\n")}`;
}

export function formatFilmEventsForScoutingNotes(
  events: FilmRoomEvent[],
  sessionTitle: string,
  analyzeTimestamp: number,
): string {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const timeLabel = formatFilmEventTime(analyzeTimestamp);
  const header = [`Coach tags`, sessionTitle.trim(), timeLabel]
    .filter(Boolean)
    .join(" @ ");
  const lines = [header, "Tagged actions:"];
  for (const event of sorted) {
    const label = FILM_ROOM_EVENT_LABELS[event.kind] ?? event.kind;
    const note = event.note?.trim();
    lines.push(
      note
        ? `• ${formatFilmEventTime(event.time)} ${label} — ${note}`
        : `• ${formatFilmEventTime(event.time)} ${label}`,
    );
  }
  return lines.join("\n").trim();
}

export function mergeCoachTagsIntoScoutingNotes(
  existing: string | undefined,
  events: FilmRoomEvent[],
  sessionTitle: string,
  analyzeTimestamp: number,
): string {
  if (!events.length) return existing?.trim() ?? "";
  const block = formatFilmEventsForScoutingNotes(
    events,
    sessionTitle,
    analyzeTimestamp,
  );
  const prior = existing?.trim();
  if (!prior) return block;
  if (prior.includes(block.slice(0, 32))) return prior;
  return `${prior}\n\n${block}`;
}

export function normalizeFilmAnalyzeEvents(raw: unknown): FilmRoomEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: FilmRoomEvent[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const kind = normalizeFilmEventKind((row as { kind?: unknown }).kind);
    if (!kind) continue;
    const time = Number((row as { time?: unknown }).time);
    if (!Number.isFinite(time) || time < 0) continue;
    const noteRaw = (row as { note?: unknown }).note;
    const note =
      typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim().slice(0, 200) : undefined;
    out.push({
      id: typeof (row as { id?: unknown }).id === "string" ? (row as { id: string }).id : `evt_${out.length}`,
      kind,
      time,
      note,
      createdAt:
        typeof (row as { createdAt?: unknown }).createdAt === "number"
          ? (row as { createdAt: number }).createdAt
          : Date.now(),
    });
    if (out.length >= FILM_ANALYZE_EVENT_MAX) break;
  }
  return out;
}

export function findLastFilmEvent(events: FilmRoomEvent[]): FilmRoomEvent | null {
  if (!events.length) return null;
  return [...events].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}
