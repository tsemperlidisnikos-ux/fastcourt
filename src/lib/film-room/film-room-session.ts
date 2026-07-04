import type { FilmRoomSession } from "@/types/film-room";

/** Ensure optional fields exist for sessions saved before Level A. */
export function normalizeFilmRoomSession(session: FilmRoomSession): FilmRoomSession {
  return {
    ...session,
    events: Array.isArray(session.events) ? session.events : [],
    analyses: Array.isArray(session.analyses) ? session.analyses : [],
  };
}
