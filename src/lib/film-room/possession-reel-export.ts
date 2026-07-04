import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import { formatFilmEventTime } from "@/lib/film-room/film-event-tags";
import type { PossessionPlaylistItem } from "@/lib/film-room/film-possession-playlist";
import type { FilmRoomBookmarkKind, FilmRoomVideoSource } from "@/types/film-room";

export const REEL_DEFAULT_SEGMENT_SEC = 12;
export const REEL_MAX_SEGMENT_SEC = 20;
export const REEL_MAX_SEGMENTS = 24;
export const REEL_PAD_SEC = 2;

export interface PossessionReelSegment {
  index: number;
  bookmarkId: string;
  label: string;
  kind: FilmRoomBookmarkKind;
  startSec: number;
  endSec: number;
  durationSec: number;
  timeLabel: string;
  deepLink: string;
  note?: string;
}

export interface PossessionReelManifest {
  version: 1;
  sessionId: string;
  sessionTitle: string;
  sourceKind: FilmRoomVideoSource["kind"];
  generatedAt: string;
  segmentCount: number;
  segments: PossessionReelSegment[];
}

function segmentEndSec(
  items: PossessionPlaylistItem[],
  index: number,
  videoDuration: number,
): number {
  const start = items[index]!.time;
  const next = items[index + 1]?.time;
  if (next != null && next > start + 0.5) {
    return Math.min(next, start + REEL_MAX_SEGMENT_SEC);
  }
  const fallbackEnd = start + REEL_DEFAULT_SEGMENT_SEC;
  if (videoDuration > 0) {
    return Math.min(videoDuration, fallbackEnd);
  }
  return fallbackEnd;
}

export function buildPossessionReelSegments(input: {
  sessionId: string;
  origin: string;
  items: PossessionPlaylistItem[];
  videoDuration: number;
}): PossessionReelSegment[] {
  const capped = input.items.slice(0, REEL_MAX_SEGMENTS);
  return capped.map((item, index) => {
    const startSec = Math.max(0, item.time - REEL_PAD_SEC);
    const endSec = segmentEndSec(capped, index, input.videoDuration);
    const durationSec = Math.max(1, endSec - startSec);
    return {
      index: index + 1,
      bookmarkId: item.bookmarkId,
      label: item.label,
      kind: item.kind,
      startSec,
      endSec,
      durationSec,
      timeLabel: formatFilmEventTime(item.time),
      deepLink: `${input.origin}${buildFilmRoomDeepLink(input.sessionId, item.time)}`,
      note: item.note,
    };
  });
}

export function buildPossessionReelManifest(input: {
  sessionId: string;
  sessionTitle: string;
  source: FilmRoomVideoSource;
  origin: string;
  items: PossessionPlaylistItem[];
  videoDuration: number;
}): PossessionReelManifest {
  const segments = buildPossessionReelSegments({
    sessionId: input.sessionId,
    origin: input.origin,
    items: input.items,
    videoDuration: input.videoDuration,
  });
  return {
    version: 1,
    sessionId: input.sessionId,
    sessionTitle: input.sessionTitle,
    sourceKind: input.source.kind,
    generatedAt: new Date().toISOString(),
    segmentCount: segments.length,
    segments,
  };
}

export function formatPossessionReelCutList(manifest: PossessionReelManifest): string {
  const lines = [
    `FastCourt Possession Reel — ${manifest.sessionTitle}`,
    `Session: ${manifest.sessionId}`,
    `Generated: ${manifest.generatedAt}`,
    "",
  ];
  for (const segment of manifest.segments) {
    lines.push(
      `${segment.index}. ${segment.timeLabel}  ${segment.label}  [${segment.startSec.toFixed(1)}s → ${segment.endSec.toFixed(1)}s]`,
    );
    lines.push(`   ${segment.deepLink}`);
    if (segment.note) lines.push(`   ${segment.note}`);
  }
  return lines.join("\n");
}

export function formatPossessionReelMarkdown(manifest: PossessionReelManifest): string {
  const lines = [
    `# Possession reel — ${manifest.sessionTitle}`,
    "",
    "| # | Time | Label | Duration | Link |",
    "|---|------|-------|----------|------|",
  ];
  for (const segment of manifest.segments) {
    lines.push(
      `| ${segment.index} | ${segment.timeLabel} | ${segment.label} | ${Math.round(segment.durationSec)}s | [Open](${segment.deepLink}) |`,
    );
  }
  return lines.join("\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = "text/plain;charset=utf-8",
) {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
