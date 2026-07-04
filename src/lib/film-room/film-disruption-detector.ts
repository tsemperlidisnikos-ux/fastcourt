import {
  normalizeCounterCoverage,
  type CounterCoverageId,
} from "@/lib/film-room/film-counter-playbook";
import type {
  FilmClipCounterSuggestion,
  FilmClipAiDisruption,
  FilmClipPlayPattern,
} from "@/lib/film-room/film-clip-analyze-types";
import {
  FILM_ROOM_DISRUPTION_LABELS,
  normalizeFilmDisruptionKind,
} from "@/lib/film-room/film-disruption-tags";
import type { FilmRoomDisruption, FilmRoomDisruptionKind } from "@/types/film-room";

export type DisruptionConfidence = "high" | "medium" | "low";

export interface OffenseReadSuggestion {
  label: string;
  detail: string;
  searchHints: readonly string[];
  coverage: CounterCoverageId | FilmRoomDisruptionKind;
  priority: "high" | "medium" | "low";
}

export interface FilmDisruptionAssessment {
  detected: boolean;
  confidence: DisruptionConfidence;
  headline: string;
  reason: string;
  coverage?: CounterCoverageId;
  pattern?: string;
  suggestedReads: OffenseReadSuggestion[];
}

/** Offensive read when a defensive coverage disrupts the primary action. */
export const COVERAGE_OFFENSE_READS: Record<
  string,
  { label: string; detail: string; hints: readonly string[] }
> = {
  ice: {
    label: "Reject / snake",
    detail: "Reject the ball screen and re-attack baseline side or snake back.",
    hints: ["reject", "snake", "baseline", "re-screen"],
  },
  switch: {
    label: "Slip / pop",
    detail: "Slip the screener early or pop the big before the switch settles.",
    hints: ["slip", "pop", "short roll", "ghost"],
  },
  drop: {
    label: "Pull-up / pocket pass",
    detail: "Pull-up in the pocket or hit the roller before drop recovers.",
    hints: ["pull", "pocket", "mid", "floater"],
  },
  hedge: {
    label: "Split / short roll",
    detail: "Split the hedge gap or short roll before recover closes the lane.",
    hints: ["split", "short roll", "reject", "snake"],
  },
  trap: {
    label: "Escape pass / skip",
    detail: "Pass out of trap to short roll or skip to weak-side shooter.",
    hints: ["escape", "skip", "pass out", "short roll"],
  },
  deny: {
    label: "Back cut / dribble handoff",
    detail: "Backdoor cut or re-route with DHO when first pass is denied.",
    hints: ["backdoor", "back cut", "dho", "handoff"],
  },
  top_lock: {
    label: "Backdoor / flare",
    detail: "Backdoor cut or flare screen when shooter is top-locked.",
    hints: ["backdoor", "flare", "pin down", "curl"],
  },
  help: {
    label: "Skip / kick-out",
    detail: "Draw help and skip to open corner or nail before closeout.",
    hints: ["skip", "kick", "corner", "swing"],
  },
  collapse: {
    label: "Skip / corner three",
    detail: "One more pass to weak-side corner when help collapses.",
    hints: ["skip", "corner", "kick", "swing"],
  },
  blitz: {
    label: "Escape / short roll",
    detail: "Pass out of blitz to short roll or corner before rotation.",
    hints: ["escape", "blitz", "short roll", "corner"],
  },
  show: {
    label: "Reject / split",
    detail: "Reject or split before show recovers to roller.",
    hints: ["reject", "split", "snake"],
  },
};

const DISRUPTION_TO_COVERAGE: Record<FilmRoomDisruptionKind, CounterCoverageId> = {
  hedge: "hedge",
  switch: "switch",
  trap: "trap",
  ice: "ice",
  deny: "other",
  top_lock: "other",
  help: "other",
  collapse: "other",
  drop: "drop",
};

function readForCoverage(
  coverage: CounterCoverageId | FilmRoomDisruptionKind,
  pattern?: string,
): OffenseReadSuggestion | null {
  const key = String(coverage).toLowerCase();
  const row = COVERAGE_OFFENSE_READS[key];
  if (!row) return null;
  const patternNote = pattern ? ` vs ${pattern}` : "";
  return {
    label: row.label,
    detail: `${row.detail}${patternNote}`,
    searchHints: row.hints,
    coverage,
    priority: "high",
  };
}

function disruptionKindToCoverage(kind: FilmRoomDisruptionKind): CounterCoverageId {
  return DISRUPTION_TO_COVERAGE[kind] ?? "other";
}

function inferCoverageFromText(text: string): CounterCoverageId | null {
  const normalized = normalizeCounterCoverage(text);
  return normalized !== "other" ? normalized : null;
}

function primaryPattern(patterns: FilmClipPlayPattern[]): string | undefined {
  if (!patterns.length) return undefined;
  return [...patterns].sort((a, b) => b.confidence - a.confidence)[0]?.tag;
}

function buildReads(
  coverages: Array<CounterCoverageId | FilmRoomDisruptionKind>,
  pattern?: string,
): OffenseReadSuggestion[] {
  const seen = new Set<string>();
  const reads: OffenseReadSuggestion[] = [];
  for (const coverage of coverages) {
    const read = readForCoverage(coverage, pattern);
    if (!read || seen.has(read.label)) continue;
    seen.add(read.label);
    reads.push(read);
  }
  return reads.slice(0, 4);
}

export interface DetectFilmDisruptionInput {
  disruptionTags?: FilmRoomDisruption[];
  playPatterns?: FilmClipPlayPattern[];
  counters?: FilmClipCounterSuggestion[];
  aiDisruption?: FilmClipAiDisruption;
  aiSummary?: string;
}

/** Rule-based disruption assessment from coach tags + AI scout read. */
export function detectFilmDisruption(
  input: DetectFilmDisruptionInput,
): FilmDisruptionAssessment {
  const tags = input.disruptionTags ?? [];
  const patterns = input.playPatterns ?? [];
  const counters = input.counters ?? [];
  const aiDisruption = input.aiDisruption;
  const pattern = primaryPattern(patterns);
  const coverages: Array<CounterCoverageId | FilmRoomDisruptionKind> = [];

  for (const tag of tags) {
    coverages.push(tag.kind);
    const mapped = disruptionKindToCoverage(tag.kind);
    if (mapped !== "other") coverages.push(mapped);
  }

  if (aiDisruption?.detected && aiDisruption.coverage) {
    coverages.push(aiDisruption.coverage);
  }

  for (const counter of counters) {
    if (counter.coverage && counter.coverage !== "other") {
      coverages.push(counter.coverage);
    }
  }

  const summaryHay = (input.aiSummary ?? "").toLowerCase();
  for (const kind of Object.keys(COVERAGE_OFFENSE_READS)) {
    if (summaryHay.includes(kind.replace(/_/g, " ")) || summaryHay.includes(kind)) {
      coverages.push(kind as CounterCoverageId);
    }
  }

  const inferred = inferCoverageFromText(summaryHay);
  if (inferred) coverages.push(inferred);

  if (aiDisruption?.suggestedRead) {
    const readToken = aiDisruption.suggestedRead.toLowerCase();
    for (const kind of Object.keys(COVERAGE_OFFENSE_READS)) {
      const row = COVERAGE_OFFENSE_READS[kind];
      if (row?.hints.some((hint) => readToken.includes(hint))) {
        coverages.push(kind as CounterCoverageId);
      }
    }
  }

  const uniqueCoverages = [...new Set(coverages.map(String))];
  const detected =
    uniqueCoverages.length > 0 || aiDisruption?.detected === true || tags.length > 0;
  let suggestedReads = buildReads(coverages, pattern);

  if (
    suggestedReads.length === 0 &&
    aiDisruption?.detected &&
    aiDisruption.suggestedRead
  ) {
    suggestedReads = [
      {
        label: aiDisruption.suggestedRead,
        detail: aiDisruption.summary || aiDisruption.whatBroke || "AI suggested read",
        searchHints: [aiDisruption.suggestedRead.toLowerCase()],
        coverage: aiDisruption.coverage ?? "other",
        priority: "high",
      },
    ];
  }

  if (!detected) {
    return {
      detected: false,
      confidence: "low",
      headline: "No disruption tagged",
      reason: "Tag defensive reads (H hedge, W switch, I ICE…) or run AI analyze.",
      suggestedReads: [],
    };
  }

  const primaryTag = tags[0];
  const primaryCounter = counters[0];
  const coverage =
    (primaryTag ? disruptionKindToCoverage(primaryTag.kind) : undefined) ??
    aiDisruption?.coverage ??
    primaryCounter?.coverage ??
    inferCoverageFromText(uniqueCoverages.join(" ")) ??
    undefined;

  const tagLabels = tags.map(
    (tag) => FILM_ROOM_DISRUPTION_LABELS[tag.kind] ?? tag.kind,
  );
  const confidence: DisruptionConfidence =
    tags.length > 0 && (aiDisruption?.detected || counters.length > 0 || patterns.length > 0)
      ? "high"
      : aiDisruption?.detected || tags.length > 0 || counters.length > 0
        ? "medium"
        : "low";

  const headline =
    pattern && coverage
      ? `${pattern} disrupted — ${coverage.toUpperCase()}`
      : tagLabels.length
        ? `Defense: ${tagLabels.join(", ")}`
        : "Play disrupted";

  const reasonParts: string[] = [];
  if (tagLabels.length) {
    reasonParts.push(`Coach tags: ${tagLabels.join(", ")}`);
  }
  if (aiDisruption?.whatBroke) {
    reasonParts.push(`AI: ${aiDisruption.whatBroke}`);
  } else if (aiDisruption?.summary) {
    reasonParts.push(`AI: ${aiDisruption.summary}`);
  }
  if (pattern) reasonParts.push(`Offense set: ${pattern}`);
  if (primaryCounter?.title) {
    reasonParts.push(`Scout counter: ${primaryCounter.title}`);
  }
  if (primaryTag?.note) reasonParts.push(primaryTag.note);

  return {
    detected: true,
    confidence,
    headline,
    reason: reasonParts.join(" · ") || "Defensive coverage broke the primary action.",
    coverage,
    pattern,
    suggestedReads,
  };
}

/** Map disruption kind to default read label for Designer frames. */
export function defaultReadLabelForDisruption(
  kind: FilmRoomDisruptionKind | CounterCoverageId,
): string {
  const read = readForCoverage(kind);
  if (read) return `If ${FILM_ROOM_DISRUPTION_LABELS[kind as FilmRoomDisruptionKind] ?? String(kind).toUpperCase()} — ${read.label}`;
  const normalized = normalizeFilmDisruptionKind(kind);
  if (normalized) {
    return `If ${FILM_ROOM_DISRUPTION_LABELS[normalized]}`;
  }
  return `If ${String(kind).toUpperCase()}`;
}
