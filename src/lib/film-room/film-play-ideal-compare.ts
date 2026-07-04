import {
  normalizeCounterCoverage,
  type CounterCoverageId,
} from "@/lib/film-room/film-counter-playbook";
import { resolvePlayFrameLinks } from "@/lib/designer/designer-deep-link";
import type {
  FilmClipAiDisruption,
  FilmClipAnalysisResult,
} from "@/lib/film-room/film-clip-analyze-types";
import type { StoredPlay } from "@/types/library";

export interface PlayIdealCompareResult {
  playId: string;
  playTitle: string;
  expectedPattern?: string;
  expectedSummary: string;
  actualPattern?: string;
  actualCoverage?: string;
  whatBroke?: string;
  aligned: boolean;
  mismatchNote?: string;
  primaryFrameIndex: number;
  readFrameIndex?: number;
}

function haystackForPlay(play: StoredPlay) {
  return [play.title, play.series, ...(play.tags || []), play.playNotes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferExpectedPattern(play: StoredPlay): string | undefined {
  const hay = haystackForPlay(play);
  const tokens = [
    "horns",
    "pnr",
    "pick and roll",
    "flare",
    "stagger",
    "spain",
    "dho",
    "iso",
    "flex",
    "motion",
    "stack",
    "zipper",
    "floppy",
  ];
  for (const token of tokens) {
    if (hay.includes(token)) {
      if (token === "pick and roll") return "PNR";
      return token.charAt(0).toUpperCase() + token.slice(1);
    }
  }
  return undefined;
}

function primaryPattern(analysis: FilmClipAnalysisResult): string | undefined {
  if (!analysis.playPatterns.length) return undefined;
  return [...analysis.playPatterns].sort((a, b) => b.confidence - a.confidence)[0]
    ?.tag;
}

function resolveCoverage(
  aiDisruption?: FilmClipAiDisruption,
  counters?: FilmClipAnalysisResult["coaching"]["counters"],
): CounterCoverageId | undefined {
  if (aiDisruption?.coverage) {
    const normalized = normalizeCounterCoverage(aiDisruption.coverage);
    if (normalized !== "other") return normalized;
  }
  const counter = counters?.[0];
  if (counter?.coverage && counter.coverage !== "other") {
    return counter.coverage;
  }
  return undefined;
}

/** Compare library play intent vs AI scout + disruption read. */
export function comparePlayIdealToDisruption(
  play: StoredPlay,
  analysis: FilmClipAnalysisResult,
): PlayIdealCompareResult {
  const expectedPattern = inferExpectedPattern(play);
  const actualPattern = primaryPattern(analysis);
  const aiDisruption = analysis.disruption;
  const actualCoverage = resolveCoverage(
    aiDisruption,
    analysis.coaching.counters,
  );
  const whatBroke = aiDisruption?.whatBroke?.trim();
  const { primaryFrameIndex, readFrameIndex } = resolvePlayFrameLinks(
    play.frames,
    actualCoverage,
  );

  const expectedSummary = expectedPattern
    ? `Planned: ${expectedPattern}`
    : `Planned: ${play.title}`;

  let aligned = true;
  let mismatchNote: string | undefined;

  if (
    expectedPattern &&
    actualPattern &&
    expectedPattern.toLowerCase() !== actualPattern.toLowerCase()
  ) {
    aligned = false;
    mismatchNote = `Diagram/tags suggest ${expectedPattern}, film shows ${actualPattern}.`;
  }

  if (aiDisruption?.detected) {
    aligned = false;
    const broke = whatBroke || aiDisruption.summary || "Defense disrupted the primary action.";
    mismatchNote = mismatchNote ? `${mismatchNote} ${broke}` : broke;
  }

  if (readFrameIndex !== undefined && aiDisruption?.detected) {
    mismatchNote = `${mismatchNote ?? ""} Read frame available for ${actualCoverage?.toUpperCase() ?? "coverage"}.`.trim();
  }

  return {
    playId: play.id,
    playTitle: play.title,
    expectedPattern,
    expectedSummary,
    actualPattern,
    actualCoverage,
    whatBroke,
    aligned,
    mismatchNote,
    primaryFrameIndex,
    readFrameIndex,
  };
}

export function bestMatchingPlayCompare(
  plays: StoredPlay[],
  analysis: FilmClipAnalysisResult,
  candidatePlayIds: string[],
): PlayIdealCompareResult | null {
  const byId = new Map(plays.map((play) => [play.id, play]));
  for (const playId of candidatePlayIds) {
    const play = byId.get(playId);
    if (!play) continue;
    return comparePlayIdealToDisruption(play, analysis);
  }
  return null;
}
