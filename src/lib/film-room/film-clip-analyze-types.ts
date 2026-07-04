import type { OpponentTendencyKind } from "@/types/library-meta";
import type { CounterCoverageId } from "@/lib/film-room/film-counter-playbook";

export interface FilmClipAnalysisTendency {
  kind: OpponentTendencyKind;
  label: string;
  confidence: number;
  notes?: string;
}

/** Recognized action / set tags (Horns, PNR, Flare, etc.). */
export interface FilmClipPlayPattern {
  tag: string;
  confidence: number;
  notes?: string;
}

export type FilmClipCoachingCategoryId =
  | "alternativeOptions"
  | "counters"
  | "defensiveAdjustments"
  | "spacingFixes"
  | "timingCorrections";

export type FilmClipCoachingPriority = "high" | "medium" | "low";

export interface FilmClipCoachingSuggestion {
  title: string;
  detail: string;
  priority?: FilmClipCoachingPriority;
}

/** Rich counter suggestion tied to coverage + opponent pattern. */
export interface FilmClipCounterSuggestion extends FilmClipCoachingSuggestion {
  coverage: CounterCoverageId;
  targetsPattern?: string;
  trigger?: string;
  ballHandlerRule?: string;
  screenerRule?: string;
  /** What the offense is trying to exploit. */
  weakPoint?: string;
}

export interface FilmClipCoachingRecommendations {
  alternativeOptions: FilmClipCoachingSuggestion[];
  counters: FilmClipCounterSuggestion[];
  defensiveAdjustments: FilmClipCoachingSuggestion[];
  spacingFixes: FilmClipCoachingSuggestion[];
  timingCorrections: FilmClipCoachingSuggestion[];
}

/** AI vision read of whether defense broke the offense plan. */
export interface FilmClipAiDisruption {
  detected: boolean;
  coverage?: CounterCoverageId;
  whatBroke?: string;
  suggestedRead?: string;
  summary?: string;
  confidence?: "high" | "medium" | "low";
}

export interface FilmClipAnalysisResult {
  summary: string;
  tendencies: FilmClipAnalysisTendency[];
  playPatterns: FilmClipPlayPattern[];
  coaching: FilmClipCoachingRecommendations;
  disruption?: FilmClipAiDisruption;
}

export interface FilmClipAnalyzeRequest {
  frames: string[];
  timestamp: number;
  sessionTitle?: string;
  /** Seconds for each frame (same order as frames). */
  frameTimes?: number[];
  /** Coach-tagged events near the analyze window. */
  filmEvents?: Array<{
    kind: string;
    time: number;
    note?: string;
  }>;
  /** Defensive disruption tags near the analyze window. */
  filmDisruptions?: Array<{
    kind: string;
    time: number;
    note?: string;
  }>;
}

export interface FilmClipAnalyzeResponse {
  ok: true;
  result: FilmClipAnalysisResult;
}

export interface FilmClipAnalyzeErrorResponse {
  ok: false;
  error: string;
  code?: "not_configured" | "invalid_request" | "upstream";
}

export interface FilmAnalyzeStatusResponse {
  ok: true;
  configured: boolean;
  model: string;
}
