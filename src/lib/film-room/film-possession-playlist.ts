import { formatFilmEventTime } from "@/lib/film-room/film-event-tags";
import { sortFilmBookmarks } from "@/lib/film-room/film-room-bookmarks";
import type { FilmRoomBookmark, FilmRoomBookmarkKind } from "@/types/film-room";

export type PossessionPlaylistFilter = "all" | "disruption" | "chapter";

export interface PossessionPlaylistItem {
  bookmarkId: string;
  time: number;
  timeLabel: string;
  label: string;
  note?: string;
  kind: FilmRoomBookmarkKind;
}

export function buildPossessionPlaylist(
  bookmarks: FilmRoomBookmark[],
  filter: PossessionPlaylistFilter = "all",
): PossessionPlaylistItem[] {
  const sorted = sortFilmBookmarks(bookmarks);
  const filtered =
    filter === "all"
      ? sorted
      : sorted.filter((row) => (row.kind ?? "chapter") === filter);

  return filtered.map((row) => ({
    bookmarkId: row.id,
    time: row.time,
    timeLabel: formatFilmEventTime(row.time),
    label: row.label,
    note: row.note,
    kind: row.kind ?? "chapter",
  }));
}

/** Index of the playlist item closest to (at or before) currentTime. */
export function possessionPlaylistIndexAtTime(
  items: PossessionPlaylistItem[],
  currentTime: number,
): number {
  if (!items.length) return -1;
  let best = 0;
  for (let index = 0; index < items.length; index += 1) {
    if (items[index]!.time <= currentTime + 0.35) best = index;
    else break;
  }
  return best;
}

export function nextPossessionPlaylistIndex(
  items: PossessionPlaylistItem[],
  currentIndex: number,
): number {
  if (!items.length) return -1;
  if (currentIndex < 0) return 0;
  return Math.min(items.length - 1, currentIndex + 1);
}

export function prevPossessionPlaylistIndex(
  items: PossessionPlaylistItem[],
  currentIndex: number,
): number {
  if (!items.length) return -1;
  if (currentIndex < 0) return items.length - 1;
  return Math.max(0, currentIndex - 1);
}
