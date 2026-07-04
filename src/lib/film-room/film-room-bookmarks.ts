import type { FilmRoomBookmark, FilmRoomBookmarkKind } from "@/types/film-room";
import { formatFilmEventTime } from "@/lib/film-room/film-event-tags";

export const FILM_BOOKMARK_QUICK_LABELS = [
  "Possession",
  "ATO",
  "Horns",
  "PnR",
  "Transition",
  "Defense",
  "Offense",
] as const;

export function newFilmBookmarkId() {
  return `film_bm_${crypto.randomUUID()}`;
}

export function defaultFilmBookmarkLabel(time: number) {
  const clock = formatFilmEventTime(time);
  return clock ? `Chapter @ ${clock}` : "Chapter";
}

export function normalizeFilmBookmarks(
  raw: FilmRoomBookmark[] | undefined,
): FilmRoomBookmark[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const bookmarks: FilmRoomBookmark[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const label = row.label?.trim();
    if (!label) continue;
    const time =
      typeof row.time === "number" && Number.isFinite(row.time) && row.time >= 0
        ? row.time
        : 0;
    const id = row.id?.trim() || newFilmBookmarkId();
    if (seen.has(id)) continue;
    seen.add(id);
    bookmarks.push({
      id,
      time,
      label: label.slice(0, 80),
      note: row.note?.trim()?.slice(0, 240) || undefined,
      kind: row.kind === "disruption" ? "disruption" : "chapter",
      createdAt:
        typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
          ? row.createdAt
          : Date.now(),
    });
  }
  return sortFilmBookmarks(bookmarks);
}

export function sortFilmBookmarks(bookmarks: FilmRoomBookmark[]): FilmRoomBookmark[] {
  return [...bookmarks].sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.createdAt - b.createdAt;
  });
}

export const FILM_DISRUPTION_BOOKMARK_LABEL = "Plan broke here";

export function defaultDisruptionBookmarkLabel(time: number) {
  const clock = formatFilmEventTime(time);
  return clock ? `${FILM_DISRUPTION_BOOKMARK_LABEL} @ ${clock}` : FILM_DISRUPTION_BOOKMARK_LABEL;
}

export function createFilmBookmark(
  time: number,
  label?: string,
  note?: string,
  kind: FilmRoomBookmarkKind = "chapter",
): FilmRoomBookmark {
  const trimmed = label?.trim();
  return {
    id: newFilmBookmarkId(),
    time: Math.max(0, time),
    label: trimmed || (kind === "disruption" ? defaultDisruptionBookmarkLabel(time) : defaultFilmBookmarkLabel(time)),
    note: note?.trim() || undefined,
    kind,
    createdAt: Date.now(),
  };
}

export function formatFilmBookmarkSummary(bookmark: FilmRoomBookmark): string {
  return `${formatFilmEventTime(bookmark.time)} · ${bookmark.label}`;
}
