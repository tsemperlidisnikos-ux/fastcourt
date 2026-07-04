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
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Match library defensive plays to an AI counter suggestion. */
export function suggestDefensePlaysForCounter(
  plays: StoredPlay[],
  counter: FilmClipCounterSuggestion,
  excludedPlayIds: ReadonlySet<string>,
  limit = 3,
): CounterPlayMatch[] {
  const hints = [
    ...COVERAGE_SEARCH_HINTS[counter.coverage],
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
    const haystack = haystackForPlay(play);
    const isDefense =
      haystack.includes("defense") ||
      haystack.includes("def ") ||
      play.tags?.some((tag) => /def|zone|press|switch|ice|blitz/i.test(tag));
    if (!isDefense && !haystack.includes(counter.coverage.replace(/_/g, " "))) {
      continue;
    }

    const reasons: string[] = [];
    let score = isDefense ? 4 : 0;

    for (const hint of hints) {
      if (hint.length < 3) continue;
      if (haystack.includes(hint)) {
        score += 10;
        reasons.push(`coverage: ${hint}`);
      }
    }

    for (const hint of patternHints) {
      if (haystack.includes(hint)) {
        score += 6;
        reasons.push(`pattern: ${hint.slice(0, 40)}`);
      }
    }

    if (counter.targetsPattern) {
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
