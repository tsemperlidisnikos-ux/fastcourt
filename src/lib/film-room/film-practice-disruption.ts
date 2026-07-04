import type { FilmDisruptionAssessment } from "@/lib/film-room/film-disruption-detector";
import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import type { OffenseVariationMatch } from "@/lib/film-room/film-offense-variation-match";
import { comparePlayIdealToDisruption } from "@/lib/film-room/film-play-ideal-compare";
import type { PracticeSessionItem } from "@/types/library-meta";

export interface DisruptionPracticeEntry {
  playId: string;
  notes: string;
  durationMin?: number;
}

export function buildDisruptionPracticeNotes(
  match: OffenseVariationMatch,
  assessment: FilmDisruptionAssessment,
  analysis: FilmClipAnalysisResult,
): string {
  const compare = comparePlayIdealToDisruption(match.play, analysis);
  const parts = [
    `Film read: ${assessment.headline}`,
    match.readLabel ? `Read: ${match.readLabel}` : "",
    analysis.disruption?.whatBroke ? `Broke: ${analysis.disruption.whatBroke}` : "",
    compare.mismatchNote ? compare.mismatchNote : "",
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 500);
}

export function buildDisruptionPracticeEntries(
  offenseMatches: OffenseVariationMatch[],
  assessment: FilmDisruptionAssessment,
  analysis: FilmClipAnalysisResult,
): DisruptionPracticeEntry[] {
  return offenseMatches.map((match) => ({
    playId: match.play.id,
    notes: buildDisruptionPracticeNotes(match, assessment, analysis),
    durationMin: 8,
  }));
}

export function disruptionPracticeSessionTitle(sessionTitle: string) {
  const base = sessionTitle.trim() || "Film clip";
  return `Reads — ${base}`.slice(0, 80);
}

export function mergeDisruptionPracticeItems(
  existing: PracticeSessionItem[],
  entries: DisruptionPracticeEntry[],
  playsById: Map<string, { title: string }>,
): PracticeSessionItem[] {
  const seen = new Set(existing.map((item) => item.playId).filter(Boolean));
  const added: PracticeSessionItem[] = [];
  for (const entry of entries) {
    if (seen.has(entry.playId)) continue;
    seen.add(entry.playId);
    if (!playsById.has(entry.playId)) continue;
    added.push({
      id: `prac_item_${crypto.randomUUID()}`,
      playId: entry.playId,
      durationMin: entry.durationMin ?? 8,
      notes: entry.notes,
    });
  }
  return [...existing, ...added];
}
