import {
  appendOpponentTendency,
  createOpponentTendency,
  suggestDefenseForTendency,
} from "@/lib/game-plan/opponent-board";
import {
  gamePlanCategoryForPattern,
  suggestPlaysFromAiPatterns,
} from "@/lib/film-room/ai-play-pattern-match";
import {
  suggestDefensePlaysForCounter,
} from "@/lib/film-room/film-counter-playbook";
import {
  counterToTimeoutCue,
  mergeTimeoutCues,
} from "@/lib/game-plan/game-day-timeout-cues";
import { coachingCueKey } from "@/lib/film-room/film-coaching-format";
import type { FilmClipCounterSuggestion } from "@/lib/film-room/film-clip-analyze-types";
import { filmScoutNoteFromSession } from "@/lib/film-room/film-game-plan-link";
import { detectFilmDisruption } from "@/lib/film-room/film-disruption-detector";
import { suggestOffensePlaysForDisruption } from "@/lib/film-room/film-offense-variation-match";
import {
  coachingHasSuggestions,
  coachingSuggestionCount,
  emptyCoachingRecommendations,
  filterCoachingBySelectedKeys,
  mergeCoachingIntoScoutingNotes,
} from "@/lib/film-room/film-coaching-format";
import { mergeCoachTagsIntoScoutingNotes } from "@/lib/film-room/film-event-tags";
import {
  createAiScoutFilmRef,
  mergeFilmRefs,
} from "@/lib/film-room/film-game-plan-evidence";
import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import type { GamePlan, GamePlanCategoryId, GamePlanFilmRef, GamePlanTimeoutCue, OpponentTendency } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import type { FilmRoomEvent, FilmRoomDisruption } from "@/types/film-room";

export interface BuildAiScoutPatchInput {
  plan: GamePlan;
  plays: StoredPlay[];
  analysis: FilmClipAnalysisResult;
  sessionId: string;
  sessionTitle: string;
  timestamp: number;
  selectedTendencyIndices: readonly number[];
  selectedPatternIndices?: readonly number[];
  includeDefensePlays?: boolean;
  includeOffensePlays?: boolean;
  includeCoachingNotes?: boolean;
  /** Coaching cue keys (`categoryId:index`) to include in scouting notes. */
  selectedCoachingKeys?: ReadonlySet<string>;
  /** Coach tags sent with this analyze (included in scouting notes). */
  coachTags?: readonly FilmRoomEvent[];
  /** Disruption tags sent with this analyze (for read/variation matching). */
  disruptionTags?: readonly FilmRoomDisruption[];
  /** Max defensive plays suggested per tendency (default 3). */
  defensePlaysPerTendency?: number;
  /** Max offense plays from AI pattern match (default 4). */
  offensePlaysLimit?: number;
}

export interface AiScoutOffenseEntry {
  playId: string;
  categoryId: GamePlanCategoryId;
}

export interface AiScoutGamePlanPatch {
  opponentBoard: OpponentTendency[];
  defensePlayIds: string[];
  offenseEntries: AiScoutOffenseEntry[];
  scoutingNotes?: string;
  timeoutCues?: GamePlanTimeoutCue[];
  filmRefs?: GamePlanFilmRef[];
  tendencyCount: number;
  patternTags: string[];
  coachingSuggestionCount: number;
}

function gamePlanPlayIds(plan: GamePlan): Set<string> {
  return new Set(
    plan.entries.map((entry) => entry.playId).filter(Boolean) as string[],
  );
}

function patternSummary(analysis: FilmClipAnalysisResult) {
  if (!analysis.playPatterns.length) return "";
  return analysis.playPatterns.map((row) => row.tag).join(", ");
}

function resolveSelectedCounters(
  analysis: FilmClipAnalysisResult,
  selectedCoachingKeys?: ReadonlySet<string>,
): FilmClipCounterSuggestion[] {
  if (!analysis.coaching.counters.length) return [];
  if (!selectedCoachingKeys) return analysis.coaching.counters;
  return analysis.coaching.counters.filter((_, index) =>
    selectedCoachingKeys.has(coachingCueKey("counters", index)),
  );
}

function appendCounterDefensePlays(
  plays: StoredPlay[],
  counters: FilmClipCounterSuggestion[],
  seen: Set<string>,
  limitPerCounter = 2,
): string[] {
  const added: string[] = [];
  for (const counter of counters) {
    const matches = suggestDefensePlaysForCounter(
      plays,
      counter,
      seen,
      limitPerCounter,
    );
    for (const row of matches) {
      if (seen.has(row.play.id)) continue;
      seen.add(row.play.id);
      added.push(row.play.id);
    }
  }
  return added;
}

/** Build opponent board + matched library plays from an AI film analysis. */
export function buildAiScoutGamePlanPatch(
  input: BuildAiScoutPatchInput,
): AiScoutGamePlanPatch {
  const {
    plan,
    plays,
    analysis,
    sessionId,
    sessionTitle,
    timestamp,
    selectedTendencyIndices,
    selectedPatternIndices,
    includeDefensePlays = true,
    includeOffensePlays = true,
    includeCoachingNotes = true,
    selectedCoachingKeys,
    coachTags,
    disruptionTags,
    defensePlaysPerTendency = 3,
    offensePlaysLimit = 4,
  } = input;

  const picks = selectedTendencyIndices
    .map((index) => analysis.tendencies[index])
    .filter(Boolean);

  const patternPicks =
    selectedPatternIndices != null
      ? selectedPatternIndices
          .map((index) => analysis.playPatterns[index])
          .filter(Boolean)
      : analysis.playPatterns;

  const patternTags = patternPicks.map((row) => row.tag);
  const patternsLine = patternTags.length
    ? `AI patterns: ${patternTags.join(", ")}.`
    : "";

  let board = plan.opponentBoard ?? [];
  const createdTendencies: OpponentTendency[] = [];

  for (const pick of picks) {
    const aiNote = pick.notes?.trim();
    const notes = [
      filmScoutNoteFromSession(sessionTitle, timestamp, aiNote),
      patternsLine,
      analysis.summary.trim(),
    ]
      .filter(Boolean)
      .join(" — ");
    const tendency = createOpponentTendency(pick.kind, pick.label, notes, {
      filmSessionId: sessionId,
      filmTimestamp: timestamp,
    });
    board = appendOpponentTendency(board, tendency);
    createdTendencies.push(tendency);
  }

  const excludedPlayIds = gamePlanPlayIds(plan);
  const defensePlayIds: string[] = [];
  const offenseEntries: AiScoutOffenseEntry[] = [];

  if (includeDefensePlays && createdTendencies.length) {
    const seen = new Set(excludedPlayIds);
    for (const tendency of createdTendencies) {
      const suggestions = suggestDefenseForTendency(
        plays,
        tendency,
        seen,
        defensePlaysPerTendency,
      );
      for (const row of suggestions) {
        if (seen.has(row.play.id)) continue;
        seen.add(row.play.id);
        defensePlayIds.push(row.play.id);
      }
    }

    const counterPicks = resolveSelectedCounters(analysis, selectedCoachingKeys);
    defensePlayIds.push(
      ...appendCounterDefensePlays(plays, counterPicks, seen, 2),
    );
  } else if (includeDefensePlays) {
    const seen = new Set(excludedPlayIds);
    const counterPicks = resolveSelectedCounters(analysis, selectedCoachingKeys);
    defensePlayIds.push(
      ...appendCounterDefensePlays(plays, counterPicks, seen, 2),
    );
  }

  if (includeOffensePlays && patternPicks.length) {
    const seen = new Set([
      ...excludedPlayIds,
      ...defensePlayIds,
    ]);
    const offenseMatches = suggestPlaysFromAiPatterns(
      plays,
      patternPicks,
      seen,
      offensePlaysLimit,
    );
    for (const match of offenseMatches) {
      if (seen.has(match.play.id)) continue;
      seen.add(match.play.id);
      const bestPattern = patternPicks.find((pattern) =>
        match.reasons.some((reason) =>
          reason.toLowerCase().includes(pattern.tag.toLowerCase()),
        ),
      );
      offenseEntries.push({
        playId: match.play.id,
        categoryId: gamePlanCategoryForPattern(
          bestPattern?.tag ?? patternPicks[0]!.tag,
        ),
      });
    }
  }

  if (includeOffensePlays) {
    const assessment = detectFilmDisruption({
      disruptionTags: disruptionTags ? [...disruptionTags] : [],
      playPatterns: patternPicks,
      counters: resolveSelectedCounters(analysis, selectedCoachingKeys),
      aiSummary: analysis.summary,
    });
    if (assessment.suggestedReads.length) {
      const seen = new Set([
        ...excludedPlayIds,
        ...defensePlayIds,
        ...offenseEntries.map((entry) => entry.playId),
      ]);
      const variationMatches = suggestOffensePlaysForDisruption(
        plays,
        assessment.suggestedReads,
        seen,
        assessment.pattern,
        2,
      );
      for (const match of variationMatches) {
        if (seen.has(match.play.id)) continue;
        seen.add(match.play.id);
        offenseEntries.push({
          playId: match.play.id,
          categoryId: assessment.pattern
            ? gamePlanCategoryForPattern(assessment.pattern)
            : "halfcourt",
        });
      }
    }
  }

  const coachingForNotes =
    includeCoachingNotes && selectedCoachingKeys
      ? filterCoachingBySelectedKeys(analysis.coaching, selectedCoachingKeys)
      : includeCoachingNotes
        ? analysis.coaching
        : emptyCoachingRecommendations();

  let scoutingNotes: string | undefined;
  if (includeCoachingNotes && coachingHasSuggestions(coachingForNotes)) {
    scoutingNotes = mergeCoachingIntoScoutingNotes(
      plan.scoutingNotes,
      coachingForNotes,
      sessionTitle,
      timestamp,
    );
  }

  const coachTagPicks = coachTags?.length ? [...coachTags] : [];
  if (coachTagPicks.length) {
    scoutingNotes = mergeCoachTagsIntoScoutingNotes(
      scoutingNotes ?? plan.scoutingNotes,
      coachTagPicks,
      sessionTitle,
      timestamp,
    );
  }

  const priorNotes = plan.scoutingNotes?.trim() ?? "";
  if ((scoutingNotes?.trim() ?? "") === priorNotes) {
    scoutingNotes = undefined;
  }

  const selectedCounters = resolveSelectedCounters(analysis, selectedCoachingKeys);
  const newTimeoutCues = selectedCounters.map((counter) =>
    counterToTimeoutCue(counter, { sessionId, timestamp }),
  );
  const timeoutCues =
    newTimeoutCues.length > 0
      ? mergeTimeoutCues(plan.timeoutCues, newTimeoutCues)
      : undefined;

  const filmRefs = mergeFilmRefs(plan.filmRefs, [
    createAiScoutFilmRef(sessionId, timestamp, analysis.summary),
  ]);

  return {
    opponentBoard: board,
    defensePlayIds,
    offenseEntries,
    scoutingNotes,
    timeoutCues,
    filmRefs,
    tendencyCount: createdTendencies.length,
    patternTags,
    coachingSuggestionCount: includeCoachingNotes
      ? coachingSuggestionCount(coachingForNotes)
      : 0,
  };
}

/** Preview defensive plays that would be added (for UI). */
export function previewAiScoutDefensePlays(
  input: Omit<
    BuildAiScoutPatchInput,
    "includeDefensePlays" | "includeOffensePlays"
  >,
): StoredPlay[] {
  const patch = buildAiScoutGamePlanPatch({
    ...input,
    includeDefensePlays: true,
    includeOffensePlays: false,
  });
  const byId = new Map(input.plays.map((play) => [play.id, play]));
  return patch.defensePlayIds
    .map((id) => byId.get(id))
    .filter((play): play is StoredPlay => !!play);
}

/** Preview offense plays that would be added (for UI). */
export function previewAiScoutOffensePlays(
  input: Omit<
    BuildAiScoutPatchInput,
    "includeDefensePlays" | "includeOffensePlays"
  >,
): Array<{ play: StoredPlay; categoryId: GamePlanCategoryId }> {
  const patch = buildAiScoutGamePlanPatch({
    ...input,
    includeDefensePlays: false,
    includeOffensePlays: true,
  });
  const byId = new Map(input.plays.map((play) => [play.id, play]));
  return patch.offenseEntries
    .map((entry) => {
      const play = byId.get(entry.playId);
      return play ? { play, categoryId: entry.categoryId } : null;
    })
    .filter((row): row is { play: StoredPlay; categoryId: GamePlanCategoryId } =>
      !!row,
    );
}

export { patternSummary, resolveSelectedCounters };

/** Preview defensive plays matched to selected AI counters. */
export function previewAiScoutCounterPlays(
  input: Pick<BuildAiScoutPatchInput, "plan" | "plays" | "analysis" | "selectedCoachingKeys">,
): StoredPlay[] {
  const excluded = gamePlanPlayIds(input.plan);
  const counters = resolveSelectedCounters(
    input.analysis,
    input.selectedCoachingKeys,
  );
  const seen = new Set(excluded);
  const ids = appendCounterDefensePlays(input.plays, counters, seen, 3);
  const byId = new Map(input.plays.map((play) => [play.id, play]));
  return ids
    .map((id) => byId.get(id))
    .filter((play): play is StoredPlay => !!play);
}
