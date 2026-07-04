import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import type { FilmRoomAnalysisRecord, FilmRoomEventKind, FilmRoomSession } from "@/types/film-room";

export const FILM_ANALYSIS_HISTORY_MAX = 30;

export function createFilmAnalysisRecord(input: {
  playheadTime: number;
  result: FilmClipAnalysisResult;
  frameCount: number;
  coachTags: FilmRoomAnalysisRecord["coachTags"];
  disruptionTags?: FilmRoomAnalysisRecord["disruptionTags"];
}): FilmRoomAnalysisRecord {
  return {
    id: `film_an_${crypto.randomUUID()}`,
    playheadTime: input.playheadTime,
    result: input.result,
    frameCount: input.frameCount,
    coachTags: input.coachTags,
    disruptionTags: input.disruptionTags,
    createdAt: Date.now(),
  };
}

export function appendFilmAnalysisRecord(
  session: FilmRoomSession,
  record: FilmRoomAnalysisRecord,
): FilmRoomSession {
  const prior = Array.isArray(session.analyses) ? session.analyses : [];
  const analyses = [record, ...prior].slice(0, FILM_ANALYSIS_HISTORY_MAX);
  return { ...session, analyses, updatedAt: Date.now() };
}

export function removeFilmAnalysisRecord(
  session: FilmRoomSession,
  recordId: string,
): FilmRoomSession {
  const analyses = (session.analyses ?? []).filter((row) => row.id !== recordId);
  if (analyses.length === (session.analyses ?? []).length) return session;
  return { ...session, analyses, updatedAt: Date.now() };
}

export function filmAnalysisRecordLabel(record: FilmRoomAnalysisRecord): string {
  const summary = record.result.summary.trim();
  const short = summary.length > 72 ? `${summary.slice(0, 69)}…` : summary;
  return short || "AI scout read";
}

export function filmAnalysisCoachTagSummary(
  tags: Array<{ kind: FilmRoomEventKind; time: number; note?: string }>,
): string {
  if (!tags.length) return "";
  return `${tags.length} coach tag${tags.length === 1 ? "" : "s"}`;
}
