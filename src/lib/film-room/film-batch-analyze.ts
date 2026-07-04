import { formatFilmEventTime } from "@/lib/film-room/film-event-tags";
import {
  FILM_ROOM_DISRUPTION_LABELS,
} from "@/lib/film-room/film-disruption-tags";
import { sortFilmBookmarks } from "@/lib/film-room/film-room-bookmarks";
import type { FilmRoomAnalysisRecord, FilmRoomBookmark, FilmRoomDisruption } from "@/types/film-room";

export type BatchAnalyzeFilter = "disruptions" | "all_bookmarks";

export type BatchAnalyzeSource =
  | "disruption_bookmark"
  | "chapter_bookmark"
  | "disruption_tag";

export interface BatchAnalyzeTarget {
  id: string;
  time: number;
  timeLabel: string;
  label: string;
  source: BatchAnalyzeSource;
}

export const BATCH_ANALYZE_MAX_TARGETS = 8;

export interface BatchDisruptionSummary {
  analyzedCount: number;
  disruptionDetectedCount: number;
  coverageCounts: Record<string, number>;
  patternTags: string[];
  suggestedReads: string[];
  headlines: string[];
}

function timeBucket(time: number) {
  return Math.round(time * 10);
}

export function buildBatchAnalyzeTargets(
  bookmarks: FilmRoomBookmark[],
  disruptions: FilmRoomDisruption[],
  filter: BatchAnalyzeFilter = "disruptions",
): BatchAnalyzeTarget[] {
  const targets: BatchAnalyzeTarget[] = [];
  const seen = new Set<number>();

  function push(
    time: number,
    label: string,
    source: BatchAnalyzeSource,
    id: string,
  ) {
    const bucket = timeBucket(time);
    if (seen.has(bucket)) return;
    seen.add(bucket);
    targets.push({
      id,
      time: Math.max(0, time),
      timeLabel: formatFilmEventTime(time),
      label: label.trim() || "Possession",
      source,
    });
  }

  for (const bookmark of sortFilmBookmarks(bookmarks)) {
    const kind = bookmark.kind ?? "chapter";
    if (filter === "disruptions" && kind !== "disruption") continue;
    push(
      bookmark.time,
      bookmark.label,
      kind === "disruption" ? "disruption_bookmark" : "chapter_bookmark",
      bookmark.id,
    );
  }

  if (filter === "disruptions") {
    for (const row of disruptions) {
      push(
        row.time,
        FILM_ROOM_DISRUPTION_LABELS[row.kind] ?? row.kind,
        "disruption_tag",
        row.id,
      );
    }
  }

  return targets
    .sort((a, b) => a.time - b.time)
    .slice(0, BATCH_ANALYZE_MAX_TARGETS);
}

export function summarizeBatchAnalysis(
  records: FilmRoomAnalysisRecord[],
): BatchDisruptionSummary {
  const coverageCounts: Record<string, number> = {};
  const patternSet = new Set<string>();
  const readSet = new Set<string>();
  const headlines: string[] = [];
  let disruptionDetectedCount = 0;

  for (const record of records) {
    const { result } = record;
    if (result.disruption?.detected) {
      disruptionDetectedCount += 1;
      const coverage = result.disruption.coverage?.trim();
      if (coverage) {
        coverageCounts[coverage] = (coverageCounts[coverage] ?? 0) + 1;
      }
      const read = result.disruption.suggestedRead?.trim();
      if (read) readSet.add(read);
      const headline = result.disruption.whatBroke?.trim() || result.summary.trim();
      if (headline) headlines.push(headline);
    }
    for (const pattern of result.playPatterns) {
      if (pattern.tag?.trim()) patternSet.add(pattern.tag.trim());
    }
  }

  return {
    analyzedCount: records.length,
    disruptionDetectedCount,
    coverageCounts,
    patternTags: [...patternSet],
    suggestedReads: [...readSet],
    headlines,
  };
}

export function formatBatchSummaryLine(summary: BatchDisruptionSummary): string {
  const parts = [
    `${summary.analyzedCount} clip${summary.analyzedCount === 1 ? "" : "s"} analyzed`,
    `${summary.disruptionDetectedCount} disruption${summary.disruptionDetectedCount === 1 ? "" : "s"}`,
  ];
  const topCoverage = Object.entries(summary.coverageCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCoverage) parts.push(`${topCoverage[0].toUpperCase()} ×${topCoverage[1]}`);
  if (summary.suggestedReads.length) {
    parts.push(`Reads: ${summary.suggestedReads.slice(0, 3).join(", ")}`);
  }
  return parts.join(" · ");
}
