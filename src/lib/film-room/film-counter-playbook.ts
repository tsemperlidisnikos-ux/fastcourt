import type { StoredPlay } from "@/types/library";
import type { FilmClipCounterSuggestion } from "@/lib/film-room/film-clip-analyze-types";

/** Standard defensive coverages / counters. */
export type CounterCoverageId =
  | "ice"
  | "switch"
  | "drop"
  | "blitz"
  | "hedge"
  | "show"
  | "hard_show"
  | "peel"
  | "cross"
  | "zone_bump"
  | "trap"
  | "switch_cross"
  | "other";

export const COUNTER_COVERAGE_LABELS: Record<CounterCoverageId, string> = {
  ice: "ICE (force baseline)",
  switch: "Switch",
  drop: "Drop coverage",
  blitz: "Blitz / trap",
  hedge: "Hedge",
  show: "Show",
  hard_show: "Hard show",
  peel: "Peel / switch peel",
  cross: "Cross switch",
  zone_bump: "Zone bump",
  trap: "Trap",
  switch_cross: "Switch cross",
  other: "Custom counter",
};

/** Coverage chips for Counter Library UI (skip vague "other"). */
export const COUNTER_LIBRARY_COVERAGE_OPTIONS: CounterCoverageId[] = [
  "ice",
  "switch",
  "drop",
  "blitz",
  "hedge",
  "show",
  "hard_show",
  "peel",
  "cross",
  "zone_bump",
  "trap",
  "switch_cross",
];


const VALID_COVERAGES = new Set<string>(Object.keys(COUNTER_COVERAGE_LABELS));

const COVERAGE_ALIASES: Record<string, CounterCoverageId> = {
  ice: "ice",
  "force baseline": "ice",
  "force basline": "ice",
  switch: "switch",
  drop: "drop",
  "drop coverage": "drop",
  blitz: "blitz",
  trap: "trap",
  hedge: "hedge",
  show: "show",
  "hard show": "hard_show",
  hard_show: "hard_show",
  peel: "peel",
  cross: "cross",
  "zone bump": "zone_bump",
  zone_bump: "zone_bump",
  "switch cross": "switch_cross",
  switch_cross: "switch_cross",
};

/** Library tag/title hints per coverage for play matching. */
const COVERAGE_SEARCH_HINTS: Record<CounterCoverageId, readonly string[]> = {
  ice: ["ice", "baseline", "no middle", "force baseline"],
  switch: ["switch", "switch everything", "switch all"],
  drop: ["drop", "drop coverage", "drop big"],
  blitz: ["blitz", "trap", "double team", "red zone"],
  hedge: ["hedge", "hedge and recover"],
  show: ["show", "soft show"],
  hard_show: ["hard show", "hard hedge"],
  peel: ["peel", "peel switch"],
  cross: ["cross", "cross switch"],
  zone_bump: ["zone bump", "bump", "zone rotate"],
  trap: ["trap", "blitz", "double"],
  switch_cross: ["switch cross", "cross switch"],
  other: ["counter", "defense"],
};

/** Pattern-specific counter guidance injected into the AI prompt. */
export const PATTERN_COUNTER_GUIDE: Record<string, string> = {
  PNR: "ICE vs side PNR, drop vs weak guard, blitz vs elite roller, switch vs mismatch favor us.",
  Horns: "Switch cross on double gap, show on first screen, deny middle cut.",
  Flare: "Switch or fight over — nail help on flare catch, closeout baseline.",
  Stagger: "Chase or switch second screen; communicate early on screens.",
  Spain: "Switch Spain action; tag roller after back-screen; no open corner.",
  DHO: "Switch DHO or ice weak side; top side deny on handoff.",
  BLOB: "Switch all / zone bump on screens; box out weak-side rebound.",
  SLOB: "Switch or trap first action; no open corner three.",
  ATO: "Call out ATO set early; switch or blitz first action.",
  Transition: "Sprint back — stop ball, protect rim, match up late.",
  ISO: "Force left / no middle; help from nail without leaving corner.",
  Post: "Front post or 3/4 deny; dig on dribble-out double.",
  Flex: "Fight through or switch flex screens; help on baseline cut.",
  Motion: "Switch ball screens; bump cutters in motion.",
  Stack: "Switch stack screens; show on first pick.",
  Zipper: "Trail or switch zipper cut; no free curl.",
  Floppy: "Switch floppy screens; high hand on shooter.",
  Zone: "Zone bump on overload; find shooter in gaps.",
  Press: "Trap sideline, no middle, sprint to matchups after break.",
};

/** Offensive looks coaches can tag a defense play against. */
export const COUNTER_LIBRARY_VS_PATTERNS = Object.keys(PATTERN_COUNTER_GUIDE);

/** Rich local (no-AI) counter templates — coach-ready assignments. */
export const LOCAL_COUNTER_TEMPLATES: FilmClipCounterSuggestion[] = [
  {
    title: "ICE side PNR",
    detail: "Force baseline — deny middle reject and keep the roller tagged late.",
    coverage: "ice",
    targetsPattern: "PNR",
    priority: "high",
    trigger: "Ball screen set on the wing / slot",
    ballHandlerRule: "Top foot over — no middle; push baseline",
    screenerRule: "Drop to nail / short roll lane; tag late if BH rejects",
    weakPoint: "Middle reject + slip when ICE is late",
  },
  {
    title: "Drop vs weak handle",
    detail: "Big drops to paint; on-ball stays attached without fouling the pull-up.",
    coverage: "drop",
    targetsPattern: "PNR",
    priority: "medium",
    trigger: "Guard without elite pull-up vs deep drop",
    ballHandlerRule: "Crowd the dribble; contest without leaving feet early",
    screenerRule: "Drop to rim line; dig on roller if BH turns corner",
    weakPoint: "Pull-up three / floater if drop is too soft",
  },
  {
    title: "Switch cross on Horns",
    detail: "Cross-switch the first gap action; deny middle cut after dual elbows.",
    coverage: "switch_cross",
    targetsPattern: "Horns",
    priority: "high",
    trigger: "Horns entry into first screen / gap",
    ballHandlerRule: "Switch early — stay square, no trail",
    screenerRule: "Show briefly then recover; communicate cross",
    weakPoint: "Backdoor / short roll if switch is late",
  },
  {
    title: "Show first Horns screen",
    detail: "Hard show on first elbow screen; nail help stays home on weak shooters.",
    coverage: "show",
    targetsPattern: "Horns",
    priority: "medium",
    trigger: "First screen at elbow from Horns",
    ballHandlerRule: "Fight over or under based on shooter grade",
    screenerRule: "Hard show, then sprint recover to roller",
    weakPoint: "Spain / second action if recover is slow",
  },
  {
    title: "Switch Spain",
    detail: "Switch the back-screen; tag the roller and protect the weak corner.",
    coverage: "switch",
    targetsPattern: "Spain",
    priority: "high",
    trigger: "Back-screen after PNR (Spain action)",
    ballHandlerRule: "Stay attached through switch; no free reject",
    screenerRule: "Tag roller then find shooter — no open corner",
    weakPoint: "Corner three if tag overhelps",
  },
  {
    title: "Nail help on flare",
    detail: "Fight over or switch flare; nail dig on catch; closeout baseline.",
    coverage: "switch",
    targetsPattern: "Flare",
    priority: "high",
    trigger: "Flare screen for weak-side shooter",
    ballHandlerRule: "Chase or switch — high hand on catch",
    screenerRule: "Bump cutter; no free curl to middle",
    weakPoint: "Catch-and-shoot if closeout is soft",
  },
  {
    title: "Switch DHO",
    detail: "Switch the handoff or ICE the weak side; deny top-side escape.",
    coverage: "switch",
    targetsPattern: "DHO",
    priority: "high",
    trigger: "Dribble handoff initiated",
    ballHandlerRule: "Top-side deny; force baseline or switch clean",
    screenerRule: "Contact on handoff; no free snake to middle",
    weakPoint: "Reject / snake middle if top side is soft",
  },
  {
    title: "Switch BLOB screens",
    detail: "Switch all screens under the basket; box out weak-side rebound.",
    coverage: "switch",
    targetsPattern: "BLOB",
    priority: "high",
    trigger: "Baseline out-of-bounds inbound",
    ballHandlerRule: "Deny first cut; switch early on screens",
    screenerRule: "Zone bump / switch stack; protect rim",
    weakPoint: "Lobs and corner threes on late switches",
  },
  {
    title: "Trap first SLOB",
    detail: "Trap or switch the first action; no open corner three.",
    coverage: "trap",
    targetsPattern: "SLOB",
    priority: "medium",
    trigger: "Sideline out-of-bounds first screen",
    ballHandlerRule: "Force sideline; no middle",
    screenerRule: "Trap / switch then rotate to corner",
    weakPoint: "Skip to opposite corner",
  },
  {
    title: "Force ISO left",
    detail: "Shade left / no middle; nail help without leaving the corner.",
    coverage: "other",
    targetsPattern: "ISO",
    priority: "medium",
    trigger: "Clear-out isolation",
    ballHandlerRule: "Body up — force weak hand / baseline",
    screenerRule: "Nail dig only; sprint back to corner",
    weakPoint: "Middle drive if shade is soft",
  },
  {
    title: "Front the post",
    detail: "3/4 front or full front; dig on bounce-out without leaving shooters.",
    coverage: "other",
    targetsPattern: "Post",
    priority: "medium",
    trigger: "Entry pass toward post",
    ballHandlerRule: "Deny high-low; dig late if needed",
    screenerRule: "Front / 3/4 deny; wall off drop step",
    weakPoint: "Lob over top or kick-out three",
  },
  {
    title: "Zone bump overload",
    detail: "Bump cutters on overload; find the shooter in the gap early.",
    coverage: "zone_bump",
    targetsPattern: "Zone",
    priority: "high",
    trigger: "Zone offense overload / skip",
    ballHandlerRule: "Close gaps on skip; high hand",
    screenerRule: "Bump cutters; no free flash to middle",
    weakPoint: "Gap threes between zones",
  },
  {
    title: "Press sideline trap",
    detail: "Trap sideline, deny middle, sprint to matchups after the break.",
    coverage: "trap",
    targetsPattern: "Press",
    priority: "high",
    trigger: "Full-court press / inbound",
    ballHandlerRule: "Force sideline; no middle split",
    screenerRule: "Second trapper arrives on bounce; rotate back",
    weakPoint: "Long outlet / middle split",
  },
];

/**
 * Build coach-ready local counters for detected patterns (no AI required).
 * Returns up to 2 counters per matched pattern, max 6 total.
 */
export function buildLocalCountersForPatterns(
  patterns: string[],
): FilmClipCounterSuggestion[] {
  const normalized = patterns
    .map((p) => p.trim())
    .filter(Boolean);
  if (!normalized.length) return [];

  const out: FilmClipCounterSuggestion[] = [];
  const seen = new Set<string>();

  for (const pattern of normalized.slice(0, 4)) {
    const key = pattern.toLowerCase();
    let addedForPattern = 0;
    for (const template of LOCAL_COUNTER_TEMPLATES) {
      const target = (template.targetsPattern ?? "").toLowerCase();
      if (!target || (target !== key && !key.includes(target) && !target.includes(key))) {
        continue;
      }
      const id = `${template.title}::${template.coverage}::${template.targetsPattern}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        ...template,
        targetsPattern: template.targetsPattern ?? pattern,
      });
      addedForPattern += 1;
      if (addedForPattern >= 2) break;
    }

    // Fallback: thin counter from PATTERN_COUNTER_GUIDE if no template hit.
    if (addedForPattern === 0) {
      const guideKey = Object.keys(PATTERN_COUNTER_GUIDE).find(
        (k) => k.toLowerCase() === key || key.includes(k.toLowerCase()),
      );
      if (!guideKey) continue;
      const guide = PATTERN_COUNTER_GUIDE[guideKey]!;
      const coverage = inferCoverageFromGuideText(guide);
      const id = `vs-${guideKey}::${coverage}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        title: `Vs ${guideKey}`,
        detail: guide,
        coverage,
        targetsPattern: guideKey,
        priority: "medium",
        trigger: `${guideKey} action starts`,
        ballHandlerRule: "Stay attached — force preferred side",
        screenerRule: "Communicate early; protect rim / corner",
        weakPoint: "Second action if first coverage is late",
      });
    }
  }

  return out.slice(0, 6);
}

function inferCoverageFromGuideText(guide: string): CounterCoverageId {
  const lower = guide.toLowerCase();
  if (lower.includes("ice")) return "ice";
  if (lower.includes("switch cross") || lower.includes("cross switch")) {
    return "switch_cross";
  }
  if (lower.includes("switch")) return "switch";
  if (lower.includes("drop")) return "drop";
  if (lower.includes("blitz") || lower.includes("trap")) return "blitz";
  if (lower.includes("hedge")) return "hedge";
  if (lower.includes("hard show")) return "hard_show";
  if (lower.includes("show")) return "show";
  if (lower.includes("zone bump") || lower.includes("bump")) return "zone_bump";
  return "other";
}

export interface CounterPlayMatch {
  play: StoredPlay;
  score: number;
  reasons: string[];
}

export function normalizeCounterCoverage(raw: unknown): CounterCoverageId {
  const token = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (VALID_COVERAGES.has(token)) return token as CounterCoverageId;
  const normalized = token.replace(/_/g, " ");
  // Longer aliases first (hard show before show).
  const aliasEntries = Object.entries(COVERAGE_ALIASES).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [alias, id] of aliasEntries) {
    if (normalized === alias || normalized.includes(alias)) return id;
  }
  return "other";
}

export function inferCounterCoverageFromText(
  title: string,
  detail: string,
): CounterCoverageId {
  const hay = `${title} ${detail}`.toLowerCase();
  for (const [alias, id] of Object.entries(COVERAGE_ALIASES)) {
    if (hay.includes(alias)) return id;
  }
  return "other";
}

export function buildPatternCounterPromptSection(): string {
  const lines = Object.entries(PATTERN_COUNTER_GUIDE).map(
    ([pattern, guide]) => `- ${pattern}: ${guide}`,
  );
  return lines.join("\n");
}

export function normalizeCounterSuggestion(
  raw: unknown,
  fallbackPattern?: string,
): FilmClipCounterSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const title =
    typeof item.title === "string" && item.title.trim()
      ? item.title.trim().slice(0, 120)
      : "";
  const detail =
    typeof item.detail === "string" && item.detail.trim()
      ? item.detail.trim().slice(0, 500)
      : "";
  if (!title || !detail) return null;

  let coverage = normalizeCounterCoverage(item.coverage);
  if (coverage === "other") {
    coverage = inferCounterCoverageFromText(title, detail);
  }

  const priorityRaw = String(item.priority ?? "").trim().toLowerCase();
  const priority =
    priorityRaw === "high" || priorityRaw === "medium" || priorityRaw === "low"
      ? priorityRaw
      : undefined;

  const targetsPattern =
    typeof item.targetsPattern === "string" && item.targetsPattern.trim()
      ? item.targetsPattern.trim().slice(0, 40)
      : fallbackPattern;

  const trimField = (key: string, max = 200) => {
    const value = item[key];
    return typeof value === "string" && value.trim()
      ? value.trim().slice(0, max)
      : undefined;
  };

  return {
    title,
    detail,
    priority,
    coverage,
    targetsPattern,
    trigger: trimField("trigger", 120),
    ballHandlerRule: trimField("ballHandlerRule"),
    screenerRule: trimField("screenerRule"),
    weakPoint: trimField("weakPoint"),
  };
}

function haystackForPlay(play: StoredPlay) {
  return [
    play.title,
    play.series,
    ...(play.tags || []),
    play.playNotes,
    play.defenseCounter?.notes,
    ...(play.defenseCounter?.coverages ?? []),
    ...(play.defenseCounter?.vsPatterns ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function patternTokensMatch(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

/** Match library defensive plays to an AI / local counter suggestion. */
export function suggestDefensePlaysForCounter(
  plays: StoredPlay[],
  counter: FilmClipCounterSuggestion,
  excludedPlayIds: ReadonlySet<string>,
  limit = 3,
): CounterPlayMatch[] {
  const coverageId = counter.coverage;
  const coverageLabel = COUNTER_COVERAGE_LABELS[coverageId].toLowerCase();
  const hints = [
    ...COVERAGE_SEARCH_HINTS[coverageId],
    counter.title.toLowerCase(),
    counter.targetsPattern?.toLowerCase() ?? "",
  ].filter((token) => token.length > 2);

  const patternHints = counter.targetsPattern
    ? (PATTERN_COUNTER_GUIDE[counter.targetsPattern]
        ?.toLowerCase()
        .split(/[,;]/)
        .map((part) => part.trim())
        .filter((part) => part.length > 3) ?? [])
    : [];

  const matches: CounterPlayMatch[] = [];

  for (const play of plays) {
    if (excludedPlayIds.has(play.id)) continue;

    const meta = play.defenseCounter;
    const isCounterLibrary = Boolean(meta?.enabled);
    const haystack = haystackForPlay(play);
    const isDefenseHeuristic =
      haystack.includes("defense") ||
      haystack.includes("def ") ||
      play.tags?.some((tag) => /def|zone|press|switch|ice|blitz/i.test(tag));

    // Structured Counter Library plays always eligible; heuristics need defense signal.
    if (
      !isCounterLibrary &&
      !isDefenseHeuristic &&
      !haystack.includes(coverageId.replace(/_/g, " "))
    ) {
      continue;
    }

    const reasons: string[] = [];
    let score = 0;

    if (isCounterLibrary) {
      score += 40;
      reasons.push("Counter Library");

      const coverages = (meta?.coverages ?? []).map((c) =>
        normalizeCounterCoverage(c),
      );
      if (coverages.includes(coverageId)) {
        score += 50;
        reasons.push(`coverage: ${coverageLabel}`);
      } else if (coverages.length === 0) {
        // Tagged as counter but no coverage chips — still useful.
        score += 8;
      }

      const vsPatterns = meta?.vsPatterns ?? [];
      if (counter.targetsPattern) {
        const hit = vsPatterns.some((pattern) =>
          patternTokensMatch(pattern, counter.targetsPattern!),
        );
        if (hit) {
          score += 45;
          reasons.push(`vs ${counter.targetsPattern}`);
        } else if (vsPatterns.length === 0) {
          score += 6;
        }
      }
    } else if (isDefenseHeuristic) {
      score += 4;
    }

    for (const hint of hints) {
      if (hint.length < 3) continue;
      if (haystack.includes(hint)) {
        score += isCounterLibrary ? 4 : 10;
        reasons.push(`coverage: ${hint}`);
      }
    }

    for (const hint of patternHints) {
      if (haystack.includes(hint)) {
        score += isCounterLibrary ? 3 : 6;
        reasons.push(`pattern: ${hint.slice(0, 40)}`);
      }
    }

    if (counter.targetsPattern && !isCounterLibrary) {
      const patternToken = counter.targetsPattern.toLowerCase();
      if (haystack.includes(patternToken)) {
        score += 8;
        reasons.push(`vs ${counter.targetsPattern}`);
      }
    }

    if (score <= 0) continue;
    matches.push({
      play,
      score,
      reasons: [...new Set(reasons)],
    });
  }

  return matches
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.play.title.localeCompare(b.play.title);
    })
    .slice(0, limit);
}

export function formatCounterForNotes(counter: FilmClipCounterSuggestion): string {
  const parts = [`• ${counter.title} (${COUNTER_COVERAGE_LABELS[counter.coverage]})`];
  if (counter.targetsPattern) {
    parts.push(`vs ${counter.targetsPattern}`);
  }
  parts.push(`— ${counter.detail}`);
  const extras: string[] = [];
  if (counter.trigger) extras.push(`Trigger: ${counter.trigger}`);
  if (counter.ballHandlerRule) extras.push(`Ball: ${counter.ballHandlerRule}`);
  if (counter.screenerRule) extras.push(`Screener: ${counter.screenerRule}`);
  if (counter.weakPoint) extras.push(`They want: ${counter.weakPoint}`);
  if (extras.length) parts.push(`[${extras.join(" · ")}]`);
  return parts.join(" ");
}
