import type { FilmRoomSession } from "@/types/film-room";
import { normalizeFilmBookmarks } from "@/lib/film-room/film-room-bookmarks";

/** Ensure optional fields exist for sessions saved before Level A. */
export function normalizeFilmRoomSession(session: FilmRoomSession): FilmRoomSession {
  return {
    ...session,
    events: Array.isArray(session.events) ? session.events : [],
    disruptions: Array.isArray(session.disruptions) ? session.disruptions : [],
    bookmarks: normalizeFilmBookmarks(session.bookmarks),
    analyses: Array.isArray(session.analyses) ? session.analyses : [],
  };
}
