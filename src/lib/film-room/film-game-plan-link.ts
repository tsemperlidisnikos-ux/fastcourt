/** Deep links between Film Room sessions and game plan opponent board. */

export function formatFilmTimestamp(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function buildFilmRoomDeepLink(
  sessionId: string,
  timestamp?: number,
): string {
  const params = new URLSearchParams();
  params.set("session", sessionId);
  if (timestamp != null && Number.isFinite(timestamp) && timestamp > 0) {
    params.set("t", String(Math.round(timestamp * 10) / 10));
  }
  return `/film-room?${params.toString()}`;
}

export function buildGamePlanDeepLink(planId: string): string {
  const params = new URLSearchParams();
  params.set("tab", "gameplan");
  params.set("plan", planId);
  return `/library?${params.toString()}`;
}

export function parseFilmRoomDeepLink(searchParams: URLSearchParams): {
  sessionId: string | null;
  timestamp: number | null;
} {
  const sessionId = searchParams.get("session")?.trim() || null;
  const raw = searchParams.get("t");
  if (raw == null || raw === "") {
    return { sessionId, timestamp: null };
  }
  const timestamp = Number.parseFloat(raw);
  return {
    sessionId,
    timestamp: Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null,
  };
}

export function filmScoutNoteFromSession(
  sessionTitle: string,
  timestamp?: number,
  extraNotes?: string,
): string {
  const timeLabel = formatFilmTimestamp(timestamp);
  const base = timeLabel
    ? `Film: ${sessionTitle} @ ${timeLabel}`
    : `Film: ${sessionTitle}`;
  const extra = extraNotes?.trim();
  return extra ? `${base} — ${extra}` : base;
}
