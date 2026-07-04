import {
  COACHING_CATEGORY_LABELS,
  COACHING_CATEGORY_ORDER,
} from "@/lib/film-room/film-coaching-format";
import {
  COUNTER_COVERAGE_LABELS,
  type CounterCoverageId,
} from "@/lib/film-room/film-counter-playbook";
import { buildFilmRoomDeepLink, formatFilmTimestamp } from "@/lib/film-room/film-game-plan-link";
import { FILM_ROOM_EVENT_LABELS } from "@/lib/film-room/film-event-tags";
import {
  FILM_ROOM_DISRUPTION_LABELS,
} from "@/lib/film-room/film-disruption-tags";
import { detectFilmDisruption } from "@/lib/film-room/film-disruption-detector";
import { normalizeFilmBookmarks, FILM_DISRUPTION_BOOKMARK_LABEL } from "@/lib/film-room/film-room-bookmarks";
import { filmRoomSourceLabel } from "@/lib/film-room/film-room-source";
import {
  buildFilmSessionEvaluation,
  formatFilmEvaluationLine,
} from "@/lib/film-room/film-read-evaluation";
import { buildPossessionPlaylist } from "@/lib/film-room/film-possession-playlist";
import {
  buildPossessionReelSegments,
  type PossessionReelSegment,
} from "@/lib/film-room/possession-reel-export";
import type {
  FilmClipAnalysisResult,
  FilmClipCoachingCategoryId,
  FilmClipCounterSuggestion,
} from "@/lib/film-room/film-clip-analyze-types";
import type { FilmRoomAnalysisRecord, FilmRoomSession, FilmRoomEventKind, FilmRoomVideoSource } from "@/types/film-room";

export interface FilmScoutPrintCoachTag {
  time: string;
  label: string;
  note?: string;
}

export interface FilmScoutPrintDisruptionTag {
  time: string;
  label: string;
  note?: string;
}

export interface FilmScoutPrintDisruption {
  headline: string;
  reason: string;
  whatBroke?: string;
  suggestedRead?: string;
  coverageLabel?: string;
  offenseReads: string[];
}

export interface FilmScoutPrintTendency {
  label: string;
  confidencePct: number;
  notes?: string;
}

export interface FilmScoutPrintPattern {
  tag: string;
  confidencePct: number;
  notes?: string;
}

export interface FilmScoutPrintCoachingItem {
  title: string;
  detail: string;
  priority?: string;
  metaLines?: string[];
}

export interface FilmScoutPrintCoachingSection {
  categoryId: FilmClipCoachingCategoryId;
  label: string;
  items: FilmScoutPrintCoachingItem[];
}

export interface FilmScoutPrintClipBlock {
  playheadLabel: string;
  clipLink: string;
  summary: string;
  tendencies: FilmScoutPrintTendency[];
  patterns: FilmScoutPrintPattern[];
  coachTags: FilmScoutPrintCoachTag[];
  disruptionTags: FilmScoutPrintDisruptionTag[];
  disruption?: FilmScoutPrintDisruption;
  coachingSections: FilmScoutPrintCoachingSection[];
}

export interface FilmScoutPrintChapter {
  timeLabel: string;
  label: string;
  note?: string;
  clipLink: string;
  kind?: "chapter" | "disruption";
}

export interface FilmScoutPrintEvaluation {
  summaryLine: string;
  disruptionRatePct: number | null;
  topCoverage?: string;
  suggestedReads: string[];
}

export interface FilmScoutPrintReelSegment {
  index: number;
  timeLabel: string;
  label: string;
  startSec: number;
  endSec: number;
  clipLink: string;
  note?: string;
  kind?: "chapter" | "disruption";
}

export interface FilmScoutPrintModel {
  reportTitle: string;
  sessionTitle: string;
  sourceLabel: string;
  generatedAtLabel: string;
  teamName: string;
  footerText: string;
  sessionLink: string;
  chapters: FilmScoutPrintChapter[];
  clips: FilmScoutPrintClipBlock[];
  evaluation?: FilmScoutPrintEvaluation;
  reelSegments?: FilmScoutPrintReelSegment[];
  reelShareLink?: string;
}

export interface FilmScoutPrintClipInput {
  playheadTime: number;
  result: FilmClipAnalysisResult;
  coachTags?: FilmRoomAnalysisRecord["coachTags"];
  disruptionTags?: FilmRoomAnalysisRecord["disruptionTags"];
}

function confidencePct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function counterMetaLines(counter: FilmClipCounterSuggestion): string[] {
  const lines: string[] = [];
  lines.push(`Coverage: ${COUNTER_COVERAGE_LABELS[counter.coverage as CounterCoverageId] ?? counter.coverage}`);
  if (counter.targetsPattern) lines.push(`vs ${counter.targetsPattern}`);
  if (counter.trigger) lines.push(`Trigger: ${counter.trigger}`);
  if (counter.ballHandlerRule) lines.push(`Ball handler: ${counter.ballHandlerRule}`);
  if (counter.screenerRule) lines.push(`Screener / big: ${counter.screenerRule}`);
  if (counter.weakPoint) lines.push(`They want: ${counter.weakPoint}`);
  return lines;
}

function mapDisruptionTags(
  tags: FilmRoomAnalysisRecord["disruptionTags"] | undefined,
): FilmScoutPrintDisruptionTag[] {
  if (!tags?.length) return [];
  return tags.map((tag) => ({
    time: formatFilmTimestamp(tag.time),
    label: FILM_ROOM_DISRUPTION_LABELS[tag.kind] ?? tag.kind,
    note: tag.note?.trim() || undefined,
  }));
}

function mapDisruptionBlock(
  result: FilmClipAnalysisResult,
  disruptionTags: FilmRoomAnalysisRecord["disruptionTags"] | undefined,
): FilmScoutPrintDisruption | undefined {
  const assessment = detectFilmDisruption({
    disruptionTags: disruptionTags?.map((tag, index) => ({
      id: `print_${index}`,
      kind: tag.kind,
      time: tag.time,
      note: tag.note,
      createdAt: Date.now(),
    })),
    playPatterns: result.playPatterns,
    counters: result.coaching.counters,
    aiDisruption: result.disruption,
    aiSummary: result.summary,
  });
  if (!assessment.detected && !result.disruption?.detected) return undefined;
  const coverageLabel = assessment.coverage
    ? COUNTER_COVERAGE_LABELS[assessment.coverage] ?? assessment.coverage
    : undefined;
  return {
    headline: assessment.headline,
    reason: assessment.reason,
    whatBroke: result.disruption?.whatBroke,
    suggestedRead:
      result.disruption?.suggestedRead ??
      assessment.suggestedReads[0]?.label,
    coverageLabel,
    offenseReads: assessment.suggestedReads.map((read) => read.label),
  };
}

function mapCoachTags(
  tags: FilmRoomAnalysisRecord["coachTags"] | undefined,
): FilmScoutPrintCoachTag[] {
  if (!tags?.length) return [];
  return tags.map((tag) => ({
    time: formatFilmTimestamp(tag.time),
    label: FILM_ROOM_EVENT_LABELS[tag.kind as FilmRoomEventKind] ?? tag.kind,
    note: tag.note?.trim() || undefined,
  }));
}

function mapCoachingSections(
  result: FilmClipAnalysisResult,
): FilmScoutPrintCoachingSection[] {
  const sections: FilmScoutPrintCoachingSection[] = [];
  for (const categoryId of COACHING_CATEGORY_ORDER) {
    const items = result.coaching[categoryId];
    if (!items.length) continue;
    sections.push({
      categoryId,
      label: COACHING_CATEGORY_LABELS[categoryId],
      items: items.map((item) => {
        if (categoryId === "counters") {
          const counter = item as FilmClipCounterSuggestion;
          return {
            title: counter.title,
            detail: counter.detail,
            priority: counter.priority,
            metaLines: counterMetaLines(counter),
          };
        }
        return {
          title: item.title,
          detail: item.detail,
          priority: item.priority,
        };
      }),
    });
  }
  return sections;
}

export function buildFilmScoutPrintClipBlock(
  sessionId: string,
  origin: string,
  input: FilmScoutPrintClipInput,
): FilmScoutPrintClipBlock {
  const playheadLabel = formatFilmTimestamp(input.playheadTime);
  return {
    playheadLabel,
    clipLink: `${origin.replace(/\/$/, "")}${buildFilmRoomDeepLink(sessionId, input.playheadTime)}`,
    summary: input.result.summary.trim(),
    tendencies: input.result.tendencies.map((row) => ({
      label: row.label,
      confidencePct: confidencePct(row.confidence),
      notes: row.notes?.trim() || undefined,
    })),
    patterns: input.result.playPatterns.map((row) => ({
      tag: row.tag,
      confidencePct: confidencePct(row.confidence),
      notes: row.notes?.trim() || undefined,
    })),
    coachTags: mapCoachTags(input.coachTags),
    disruptionTags: mapDisruptionTags(input.disruptionTags),
    disruption: mapDisruptionBlock(input.result, input.disruptionTags),
    coachingSections: mapCoachingSections(input.result),
  };
}

export function formatFilmScoutGeneratedAt(ms = Date.now()): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms);
}

export function buildFilmScoutPrintModel(input: {
  session: Pick<FilmRoomSession, "id" | "title" | "source">;
  clips: FilmScoutPrintClipInput[];
  origin: string;
  teamName: string;
  footerText: string;
  generatedAtMs?: number;
  reportTitle?: string;
}): FilmScoutPrintModel {
  const origin = input.origin.replace(/\/$/, "");
  const sorted = [...input.clips].sort((a, b) => a.playheadTime - b.playheadTime);
  const sessionTitle = input.session.title.trim() || "Film session";
  const reportTitle =
    input.reportTitle?.trim() ||
    (sorted.length === 1
      ? `Scout read — ${sessionTitle} @ ${formatFilmTimestamp(sorted[0]!.playheadTime)}`
      : `Scout report — ${sessionTitle}`);

  return {
    reportTitle,
    sessionTitle,
    sourceLabel: filmRoomSourceLabel(input.session.source),
    generatedAtLabel: formatFilmScoutGeneratedAt(input.generatedAtMs),
    teamName: input.teamName.trim(),
    footerText: input.footerText.trim(),
    sessionLink: `${origin}${buildFilmRoomDeepLink(input.session.id)}`,
    chapters: [],
    clips: sorted.map((clip) =>
      buildFilmScoutPrintClipBlock(input.session.id, origin, clip),
    ),
  };
}

function mapSessionChapters(
  session: Pick<FilmRoomSession, "id">,
  origin: string,
  bookmarks: ReturnType<typeof normalizeFilmBookmarks>,
): FilmScoutPrintChapter[] {
  return bookmarks.map((bookmark) => ({
    timeLabel: formatFilmTimestamp(bookmark.time),
    label: bookmark.label,
    note: bookmark.note,
    clipLink: `${origin.replace(/\/$/, "")}${buildFilmRoomDeepLink(session.id, bookmark.time)}`,
    kind: bookmark.kind ?? (bookmark.label.includes(FILM_DISRUPTION_BOOKMARK_LABEL) ? "disruption" : "chapter"),
  }));
}

function mapPrintReelSegments(
  segments: PossessionReelSegment[],
): FilmScoutPrintReelSegment[] {
  return segments.map((segment) => ({
    index: segment.index,
    timeLabel: segment.timeLabel,
    label: segment.label,
    startSec: segment.startSec,
    endSec: segment.endSec,
    clipLink: segment.deepLink,
    note: segment.note,
    kind: segment.kind,
  }));
}

function buildPrintEvaluation(
  analyses: FilmRoomAnalysisRecord[],
): FilmScoutPrintEvaluation | undefined {
  const evaluation = buildFilmSessionEvaluation(analyses);
  if (!evaluation.analyzedCount) return undefined;
  const topCoverage = Object.entries(evaluation.coverageCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];
  return {
    summaryLine: formatFilmEvaluationLine(evaluation),
    disruptionRatePct: evaluation.disruptionRatePct,
    topCoverage,
    suggestedReads: evaluation.suggestedReads.slice(0, 6),
  };
}

function buildPrintReelFromSession(
  session: FilmRoomSession,
  origin: string,
  videoDuration = 0,
): FilmScoutPrintReelSegment[] {
  const bookmarks = normalizeFilmBookmarks(session.bookmarks);
  if (!bookmarks.length) return [];
  const items = buildPossessionPlaylist(bookmarks, "all");
  const segments = buildPossessionReelSegments({
    sessionId: session.id,
    origin,
    items,
    videoDuration,
  });
  return mapPrintReelSegments(segments);
}

export function buildFilmScoutPrintModelFromSession(input: {
  session: FilmRoomSession;
  origin: string;
  teamName: string;
  footerText: string;
  videoDuration?: number;
  reelShareLink?: string;
}): FilmScoutPrintModel | null {
  const analyses = input.session.analyses ?? [];
  const bookmarks = normalizeFilmBookmarks(input.session.bookmarks);
  if (!analyses.length && !bookmarks.length) return null;

  const origin = input.origin.replace(/\/$/, "");
  const sessionTitle = input.session.title.trim() || "Film session";
  const reportTitle =
    analyses.length > 0
      ? analyses.length === 1 && !bookmarks.length
        ? `Scout read — ${sessionTitle} @ ${formatFilmTimestamp(analyses[0]!.playheadTime)}`
        : `Scout report — ${sessionTitle}`
      : `Chapter guide — ${sessionTitle}`;
  const reelSegments = buildPrintReelFromSession(
    input.session,
    origin,
    input.videoDuration ?? 0,
  );

  return {
    reportTitle,
    sessionTitle,
    sourceLabel: filmRoomSourceLabel(input.session.source),
    generatedAtLabel: formatFilmScoutGeneratedAt(),
    teamName: input.teamName.trim(),
    footerText: input.footerText.trim(),
    sessionLink: `${origin}${buildFilmRoomDeepLink(input.session.id)}`,
    chapters: mapSessionChapters(input.session, origin, bookmarks),
    clips: [...analyses]
      .sort((a, b) => a.playheadTime - b.playheadTime)
      .map((record) =>
        buildFilmScoutPrintClipBlock(input.session.id, origin, {
          playheadTime: record.playheadTime,
          result: record.result,
          coachTags: record.coachTags,
          disruptionTags: record.disruptionTags,
        }),
      ),
    evaluation: buildPrintEvaluation(analyses),
    reelSegments: reelSegments.length ? reelSegments : undefined,
    reelShareLink: input.reelShareLink,
  };
}

/** @deprecated Use buildFilmScoutPrintModelFromSession */
export function buildFilmScoutPrintModelFromSessionAnalyses(input: {
  session: FilmRoomSession;
  origin: string;
  teamName: string;
  footerText: string;
}): FilmScoutPrintModel | null {
  return buildFilmScoutPrintModelFromSession(input);
}
