import {
  computeFrameTimes,
  FILM_CLIP_ANALYZE_FRAME_COUNT,
  FILM_CLIP_ANALYZE_WINDOW_SEC,
} from "@/lib/film-room/capture-video-frames";
import {
  FILM_ANALYZE_EVENT_RADIUS_SEC,
  FILM_ROOM_EVENT_LABELS,
  formatFilmEventTime,
} from "@/lib/film-room/film-event-tags";
import type { FilmRoomEvent, FilmRoomDisruption } from "@/types/film-room";

export interface FilmAnalyzeContext {
  frameCount: number;
  frameTimes: number[];
  coachTags: FilmRoomEvent[];
  disruptionTags: FilmRoomDisruption[];
}

export function formatFrameSequenceForPrompt(
  centerTime: number,
  frameTimes: number[],
): string {
  if (!frameTimes.length) return "";
  const lines = frameTimes.map((time, index) => {
    const offsetSec = time - centerTime;
    const offsetLabel =
      Math.abs(offsetSec) < 0.05
        ? "at playhead"
        : `${offsetSec > 0 ? "+" : ""}${offsetSec.toFixed(2)}s from playhead`;
    return `Image ${index + 1}: ${formatFilmEventTime(time)} (${offsetLabel})`;
  });
  return `Frame sequence sent (oldest → newest, image order matches upload order):\n${lines.join("\n")}`;
}

export function normalizeFilmAnalyzeFrameTimes(
  raw: unknown,
  centerTime: number,
  frameCount: number,
  duration = Number.POSITIVE_INFINITY,
  windowSec = FILM_CLIP_ANALYZE_WINDOW_SEC,
): number[] {
  if (Array.isArray(raw) && raw.length === frameCount) {
    const parsed = raw
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (parsed.length === frameCount) return parsed;
  }
  return computeFrameTimes(centerTime, duration, frameCount, windowSec);
}

export function formatFilmAnalyzeSourceLine(context: FilmAnalyzeContext): string {
  const tagPart =
    context.coachTags.length > 0
      ? `${context.coachTags.length} coach tag${context.coachTags.length === 1 ? "" : "s"} (±${FILM_ANALYZE_EVENT_RADIUS_SEC}s)`
      : "no coach tags nearby";
  return `${context.frameCount} frames · ${tagPart}`;
}

export function formatFilmAnalyzeTagsSummary(tags: FilmRoomEvent[]): string {
  if (!tags.length) return "";
  return tags
    .map((tag) => {
      const label = FILM_ROOM_EVENT_LABELS[tag.kind] ?? tag.kind;
      const note = tag.note?.trim();
      return note
        ? `${formatFilmEventTime(tag.time)} ${label} — ${note}`
        : `${formatFilmEventTime(tag.time)} ${label}`;
    })
    .join(" · ");
}

export function buildFilmAnalyzeContext(
  coachTags: FilmRoomEvent[],
  frameTimes: number[],
  disruptionTags: FilmRoomDisruption[] = [],
): FilmAnalyzeContext {
  return {
    frameCount: frameTimes.length || FILM_CLIP_ANALYZE_FRAME_COUNT,
    frameTimes,
    coachTags,
    disruptionTags,
  };
}
