import {
  PATTERN_COUNTER_GUIDE,
  suggestDefensePlaysForCounter,
  type CounterCoverageId,
} from "@/lib/film-room/film-counter-playbook";
import { buildCoachAlternatives } from "@/lib/designer/designer-coach-alternatives";
import { buildSamePlayFrameAlternatives } from "@/lib/designer/designer-coach-same-play-frames";
import { emptyCoachingRecommendations } from "@/lib/film-room/film-coaching-format";
import {
  addHelpDefenderFixes,
  alignOnBallGuardFixes,
  relieveBallSideOverload,
  relievePaintCongestion,
  separatePlayerPair,
  tagScreenerDefenderFixes,
  type DesignerCoachApplyBundle,
} from "@/lib/designer/designer-coach-apply";
import { normalizeDefenseMarkerStyle } from "@/lib/designer/defense-marker-style";
import {
  MIN_FRAME_ANIM_DURATION_SEC,
  MAX_FRAME_ANIM_DURATION_SEC,
  resolveFrameAnimDurationSec,
} from "@/lib/designer/animation-timing";
import type {
  DesignerFrame,
  DesignerObject,
  PlayDocument,
} from "@/types/designer";
import { rosterModeFromLibraryType, type DesignerRosterMode } from "@/lib/designer/player-limits";
import {
  gamePlanDefenseLinkedPlays,
  mergeGamePlanCounters,
} from "@/lib/designer/designer-coach-game-plan";
import type {
  GamePlan,
  PlaybookSection,
  PracticeSession,
} from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import type {
  FilmClipCoachingRecommendations,
  FilmClipCounterSuggestion,
  FilmClipCoachingSuggestion,
} from "@/lib/film-room/film-clip-analyze-types";

export type DesignerCoachPlayContext = PlayDocument & {
  id?: string;
  type?: StoredPlay["type"];
  season?: string;
  team?: string;
  series?: string;
  tags?: string[];
  playNotes?: string;
};

const MIN_OFFENSE_SPACING = 0.072;
const PAINT_X_MIN = 0.3;
const PAINT_X_MAX = 0.7;
const PAINT_Y_MIN = 0.68;

const PATTERN_TOKENS = [
  "PNR",
  "Horns",
  "Flare",
  "Stagger",
  "Spain",
  "Motion",
  "Flex",
  "ISO",
  "BLOB",
  "SLOB",
  "ATO",
  "DHO",
  "Zipper",
  "Stack",
] as const;

export interface DesignerCoachLinkedPlay {
  playId: string;
  title: string;
  reason: string;
}

export interface DesignerCoachAlternativeBase {
  title: string;
  detail: string;
  priority?: FilmClipCoachingSuggestion["priority"];
  playId: string;
  playTitle: string;
  scorePct: number;
}

export type DesignerCoachAlternative =
  | (DesignerCoachAlternativeBase & { kind: "library" })
  | (DesignerCoachAlternativeBase & {
      kind: "same-play";
      frameIndex: number;
    });

export interface DesignerLocalCoachResult {
  coaching: FilmClipCoachingRecommendations;
  bundles: DesignerCoachApplyBundle[];
  alternatives: DesignerCoachAlternative[];
  inferredPatterns: string[];
  linkedPlays: DesignerCoachLinkedPlay[];
}

export interface AnalyzePlayLocallyOptions {
  playbooks?: PlaybookSection[];
  allGamePlans?: GamePlan[];
  practiceSessions?: PracticeSession[];
}

function dist(a: DesignerObject, b: DesignerObject) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function offensePlayers(objects: DesignerObject[]) {
  return objects.filter((o) => o.kind === "offense");
}

function defensePlayers(objects: DesignerObject[]) {
  return objects.filter((o) => o.kind === "defense");
}

function inPaint(x: number, y: number) {
  return x >= PAINT_X_MIN && x <= PAINT_X_MAX && y >= PAINT_Y_MIN;
}

function inferPatterns(play: DesignerCoachPlayContext, frame: DesignerFrame): string[] {
  const hay = [
    play.title,
    play.series ?? "",
    ...(play.tags ?? []),
    frame.name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const found = new Set<string>();
  for (const token of PATTERN_TOKENS) {
    if (hay.includes(token.toLowerCase())) found.add(token);
  }

  const screenCount = frame.actions.filter((a) => a.type === "screen").length;
  if (screenCount > 0 && !found.has("PNR")) found.add("PNR");
  if (frame.actions.some((a) => a.type === "handoff") && !found.has("DHO")) {
    found.add("DHO");
  }

  return [...found];
}

function spacingBundles(
  frame: DesignerFrame,
  rosterMode: DesignerRosterMode = "play",
): DesignerCoachApplyBundle[] {
  const offense = offensePlayers(frame.objects);
  if (rosterMode === "drill" && offense.length > 5) {
    return drillStationBundles(frame, offense);
  }
  let tightIndex = 0;
  const out: DesignerCoachApplyBundle[] = [];

  for (let i = 0; i < offense.length; i += 1) {
    for (let j = i + 1; j < offense.length; j += 1) {
      const a = offense[i]!;
      const b = offense[j]!;
      const d = dist(a, b);
      if (d < MIN_OFFENSE_SPACING) {
        const fixes = separatePlayerPair(a, b, MIN_OFFENSE_SPACING);
        out.push({
          key: `spacing-tight-${tightIndex++}`,
          category: "spacingFixes",
          title: "Tight spacing",
          detail: `Players ${a.label || i + 1} and ${b.label || j + 1} are only ${Math.round(d * 100)}% court apart — widen to ~8%+ for driving lanes.`,
          priority: d < 0.045 ? "high" : "medium",
          fixes,
        });
      }
    }
  }

  const paintCrowd = offense.filter((p) => inPaint(p.x, p.y));
  if (paintCrowd.length >= 3) {
    out.push({
      key: "spacing-paint",
      category: "spacingFixes",
      title: "Paint congestion",
      detail: `${paintCrowd.length} offense players in the paint — spread weak-side or lift a corner for better spacing.`,
      priority: "high",
      fixes: relievePaintCongestion(paintCrowd),
    });
  }

  const ballHandler = offense.find((p) => p.hasBall);
  if (ballHandler) {
    const sameSide = offense.filter(
      (p) =>
        p.id !== ballHandler.id &&
        Math.sign(p.x - 0.5) === Math.sign(ballHandler.x - 0.5) &&
        Math.abs(p.x - ballHandler.x) < 0.14,
    );
    if (sameSide.length >= 2) {
      out.push({
        key: "spacing-overload",
        category: "spacingFixes",
        title: "Ball-side overload",
        detail:
          "Three players on the ball side — consider weak-side lift or empty corner to open the drive.",
        priority: "medium",
        fixes: relieveBallSideOverload(ballHandler, sameSide),
      });
    }
  }

  return out.slice(0, 4);
}

function drillStationBundles(
  frame: DesignerFrame,
  offense: DesignerObject[],
): DesignerCoachApplyBundle[] {
  const paintCrowd = offense.filter((player) => inPaint(player.x, player.y));
  if (paintCrowd.length >= 6) {
    return [
      {
        key: "drill-station-crowd",
        category: "spacingFixes",
        title: "Station crowding",
        detail: `${paintCrowd.length} players in the paint area — split into groups or widen stations for a cleaner drill rep.`,
        priority: "medium",
        fixes: relievePaintCongestion(paintCrowd.slice(0, 4)),
      },
    ];
  }

  if (offense.length >= 8 && frame.actions.length === 0) {
    return [
      {
        key: "drill-no-actions",
        category: "spacingFixes",
        title: "Static drill frame",
        detail:
          "Many players but no actions drawn — add cuts/screens or split into smaller drill frames so Practice Live can cue the progression.",
        priority: "low",
        fixes: [],
      },
    ];
  }

  return [];
}

function timingBundles(frame: DesignerFrame): DesignerCoachApplyBundle[] {
  const out: DesignerCoachApplyBundle[] = [];
  const seq = frame.actionSequence ?? frame.actions.map((a) => a.id);
  const active = seq
    .map((id) => frame.actions.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a && a.timing !== "optional");

  const duration = resolveFrameAnimDurationSec(frame);
  if (active.length >= 4 && duration < 1.8) {
    out.push({
      key: "timing-fast-frame",
      category: "timingCorrections",
      title: "Frame plays too fast",
      detail: `${active.length} actions in ${duration.toFixed(1)}s — increase frame duration or split into another frame.`,
      priority: "high",
      fixes: [
        {
          type: "frameDuration",
          seconds: Math.min(MAX_FRAME_ANIM_DURATION_SEC, Math.max(2, duration * 1.5)),
        },
      ],
    });
  }

  if (duration <= MIN_FRAME_ANIM_DURATION_SEC + 0.05 && active.length >= 2) {
    out.push({
      key: "timing-min-duration",
      category: "timingCorrections",
      title: "Minimum animation duration",
      detail:
        "This frame is at the shortest animation duration — players may not finish actions before the next frame.",
      priority: "medium",
      fixes: [{ type: "frameDuration", seconds: 1.25 }],
    });
  }

  const optionalCount = frame.actions.filter((a) => a.timing === "optional").length;
  if (optionalCount >= 3) {
    out.push({
      key: "timing-optional",
      category: "timingCorrections",
      title: "Many optional actions",
      detail: `${optionalCount} optional actions — confirm which reads are live in the play call vs teaching options.`,
      priority: "low",
      fixes: [],
    });
  }

  let syncRun = 0;
  for (const action of active) {
    if (action.timing === "sync") syncRun += 1;
    else syncRun = 0;
    if (syncRun === 1 && active.length > 2) {
      out.push({
        key: `timing-sync-${action.id}`,
        category: "timingCorrections",
        title: "Lonely sync action",
        detail:
          "A single sync action — pair it with a cut or screen that must hit together.",
        priority: "low",
        fixes: [{ type: "actionTiming", actionId: action.id, timing: "normal" }],
      });
      break;
    }
  }

  return out.slice(0, 4);
}

function defenseBundles(
  frame: DesignerFrame,
  rosterMode: DesignerRosterMode = "play",
): DesignerCoachApplyBundle[] {
  if (rosterMode === "drill") return [];

  const out: DesignerCoachApplyBundle[] = [];
  const offense = offensePlayers(frame.objects);
  const defense = defensePlayers(frame.objects);

  const targetDefCount = Math.max(0, offense.length - 1);
  const missing = targetDefCount - defense.length;
  if (offense.length >= 4 && missing > 0) {
    const fixes = addHelpDefenderFixes(frame, missing, "defense-shell", rosterMode);
    if (fixes.length) {
      out.push({
        key: "defense-shell",
        category: "defensiveAdjustments",
        title: "Light defensive shell",
        detail:
          "Fewer defenders than offensive players — add nail help or tag the roller on ball screens.",
        priority: "medium",
        fixes,
      });
    }
  }

  const screens = frame.actions.filter((action) => action.type === "screen");
  for (const [index, screen] of screens.slice(0, 2).entries()) {
    const nearDef = defense.find(
      (player) =>
        Math.hypot(player.x - screen.x2, player.y - screen.y2) < 0.1,
    );
    if (!nearDef) {
      const fixes = tagScreenerDefenderFixes(
        frame,
        screen,
        `defense-screen-${index}`,
        rosterMode,
      );
      if (fixes.length) {
        out.push({
          key: `defense-screen-${index}`,
          category: "defensiveAdjustments",
          title: "Screen defender missing",
          detail:
            "Ball screen with no defender tagged on the screener — place X on the big or show ICE/switch call.",
          priority: "high",
          fixes,
        });
      }
      break;
    }
  }

  const styles = defense.map((player) =>
    normalizeDefenseMarkerStyle(player.defenseStyle),
  );
  const hasGuard = styles.some((style) => style === "guard");
  const hasMark = styles.some((style) => style === "mark");
  if (hasGuard && hasMark && defense.length >= 3) {
    const fixes = alignOnBallGuardFixes(frame);
    if (fixes.length) {
      out.push({
        key: "defense-guard-ball",
        category: "defensiveAdjustments",
        title: "Mixed mark / guard",
        detail:
          "Both mark and guard markers — confirm on-ball is guard and weak-side is in help position.",
        priority: "low",
        fixes,
      });
    }
  }

  return out.slice(0, 4);
}

function counterSuggestions(
  patterns: string[],
  library: StoredPlay[],
  excludeId: string,
  gamePlan?: GamePlan | null,
): {
  counters: FilmClipCounterSuggestion[];
  linked: DesignerCoachLinkedPlay[];
} {
  const counters: FilmClipCounterSuggestion[] = [];
  const linked: DesignerCoachLinkedPlay[] = [];
  const seenPlayIds = new Set<string>();

  for (const pattern of patterns.slice(0, 3)) {
    const guide = PATTERN_COUNTER_GUIDE[pattern];
    if (!guide) continue;

    const coverage = inferCoverageFromGuide(guide);
    const counter: FilmClipCounterSuggestion = {
      title: `Vs ${pattern}`,
      detail: guide,
      coverage,
      targetsPattern: pattern,
      priority: "medium",
    };
    counters.push(counter);

    const matches = suggestDefensePlaysForCounter(
      library,
      counter,
      new Set([excludeId]),
      2,
    );
    for (const match of matches) {
      if (seenPlayIds.has(match.play.id)) continue;
      seenPlayIds.add(match.play.id);
      linked.push({
        playId: match.play.id,
        title: match.play.title,
        reason: match.reasons[0] ?? `Counter vs ${pattern}`,
      });
    }
  }

  const mergedCounters = mergeGamePlanCounters(counters, patterns, gamePlan);
  for (const row of gamePlanDefenseLinkedPlays(gamePlan, library, excludeId)) {
    if (seenPlayIds.has(row.playId)) continue;
    seenPlayIds.add(row.playId);
    linked.push(row);
  }

  return { counters: mergedCounters, linked };
}

function inferCoverageFromGuide(guide: string): CounterCoverageId {
  const lower = guide.toLowerCase();
  if (lower.includes("ice")) return "ice";
  if (lower.includes("switch")) return "switch";
  if (lower.includes("drop")) return "drop";
  if (lower.includes("blitz") || lower.includes("trap")) return "blitz";
  if (lower.includes("hedge")) return "hedge";
  if (lower.includes("show")) return "show";
  return "other";
}

/** Rule-based coaching for the current frame (no API). */
export function analyzePlayLocally(
  play: DesignerCoachPlayContext,
  frameIndex: number,
  library: StoredPlay[],
  gamePlan?: GamePlan | null,
  options?: AnalyzePlayLocallyOptions,
): DesignerLocalCoachResult {
  const frame = play.frames[frameIndex];
  const coaching = emptyCoachingRecommendations();
  const linkedPlays: DesignerCoachLinkedPlay[] = [];

  if (!frame) {
    return {
      coaching,
      bundles: [],
      alternatives: [],
      inferredPatterns: [],
      linkedPlays,
    };
  }

  const rosterMode = rosterModeFromLibraryType(play.type);
  const spacing = spacingBundles(frame, rosterMode);
  const timing = timingBundles(frame);
  const defense = defenseBundles(frame, rosterMode);
  const bundles = [...spacing, ...timing, ...defense];

  coaching.spacingFixes = spacing.map(({ title, detail, priority }) => ({
    title,
    detail,
    priority,
  }));
  coaching.timingCorrections = timing.map(({ title, detail, priority }) => ({
    title,
    detail,
    priority,
  }));
  coaching.defensiveAdjustments = defense.map(({ title, detail, priority }) => ({
    title,
    detail,
    priority,
  }));

  const patterns = inferPatterns(play, frame);
  const counterPack =
    rosterMode === "drill"
      ? { counters: [] as FilmClipCounterSuggestion[], linked: [] as DesignerCoachLinkedPlay[] }
      : counterSuggestions(patterns, library, play.id, gamePlan);
  coaching.counters = counterPack.counters;
  linkedPlays.push(...counterPack.linked);

  const samePlayAlternatives = buildSamePlayFrameAlternatives(play, frameIndex);
  const altPack = buildCoachAlternatives({
    play,
    library,
    playbooks: options?.playbooks,
    gamePlan,
    allGamePlans: options?.allGamePlans,
    practiceSessions: options?.practiceSessions,
    limit: 5,
  });
  coaching.alternativeOptions = [
    ...samePlayAlternatives.map(({ title, detail, priority }) => ({
      title,
      detail,
      priority,
    })),
    ...altPack.coachingItems,
  ];
  linkedPlays.push(...altPack.linked);

  return {
    coaching,
    bundles,
    alternatives: [...samePlayAlternatives, ...altPack.alternatives],
    inferredPatterns: patterns,
    linkedPlays: dedupeLinked(linkedPlays),
  };
}

function dedupeLinked(rows: DesignerCoachLinkedPlay[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.playId)) return false;
    seen.add(row.playId);
    return true;
  });
}
