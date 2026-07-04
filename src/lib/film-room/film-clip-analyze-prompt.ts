import { OPPONENT_TENDENCY_PRESETS } from "@/lib/game-plan/opponent-board";
import { emptyCoachingRecommendations } from "@/lib/film-room/film-coaching-format";
import { formatFilmEventsForPrompt } from "@/lib/film-room/film-event-tags";
import { formatFrameSequenceForPrompt } from "@/lib/film-room/film-analyze-context";
import {
  buildPatternCounterPromptSection,
  normalizeCounterSuggestion,
} from "@/lib/film-room/film-counter-playbook";
import type { OpponentTendencyKind } from "@/types/library-meta";
import type { FilmRoomEvent } from "@/types/film-room";
import type {
  FilmClipAnalysisResult,
  FilmClipAnalysisTendency,
  FilmClipCoachingCategoryId,
  FilmClipCoachingPriority,
  FilmClipCoachingRecommendations,
  FilmClipCoachingSuggestion,
  FilmClipCounterSuggestion,
  FilmClipPlayPattern,
} from "@/lib/film-room/film-clip-analyze-types";

const VALID_KINDS = new Set<OpponentTendencyKind>([
  "zone",
  "press",
  "blob",
  "slob",
  "ato",
  "transition",
  "halfcourt",
  "other",
]);

const PLAY_PATTERN_TAGS = [
  "Horns",
  "PNR",
  "Flare",
  "Stagger",
  "Spain",
  "Motion",
  "Flex",
  "ISO",
  "BLOB",
  "SLOB",
  "ATO",
  "Transition",
  "Zone",
  "Press",
  "DHO",
  "Post",
  "Stack",
  "Zipper",
  "Floppy",
] as const;

const COACHING_CATEGORIES: FilmClipCoachingCategoryId[] = [
  "alternativeOptions",
  "counters",
  "defensiveAdjustments",
  "spacingFixes",
  "timingCorrections",
];

const COACHING_ITEM_SCHEMA = `{
      "title": "short action label",
      "detail": "specific coaching cue for the staff",
      "priority": "high | medium | low"
    }`;

const COUNTER_ITEM_SCHEMA = `{
      "title": "counter name coaches will call",
      "detail": "one-sentence why this beats the look",
      "priority": "high | medium | low",
      "coverage": "ice | switch | drop | blitz | hedge | show | hard_show | peel | cross | zone_bump | trap | switch_cross | other",
      "targetsPattern": "PNR | Horns | Flare | etc. (match playPatterns)",
      "trigger": "when to call it (e.g. on side PNR, after first screen)",
      "ballHandlerRule": "what on-ball defender does",
      "screenerRule": "what big/helpside does on screener/roller",
      "weakPoint": "what offense is trying to get"
    }`;

export function buildFilmClipAnalyzePrompt(
  timestamp: number,
  sessionTitle?: string,
  options?: {
    filmEvents?: FilmRoomEvent[];
    frameCount?: number;
    frameTimes?: number[];
  },
): string {
  const kinds = OPPONENT_TENDENCY_PRESETS.map(
    (row) => `${row.kind}: ${row.label}`,
  ).join(", ");

  const titleLine = sessionTitle?.trim()
    ? `Clip title: "${sessionTitle.trim()}".`
    : "";

  const frameCount = options?.frameCount ?? 10;
  const frameTimes = options?.frameTimes ?? [];
  const frameSequenceBlock = formatFrameSequenceForPrompt(timestamp, frameTimes);
  const frameSequenceSection = frameSequenceBlock
    ? `\n\n${frameSequenceBlock}\nAlign coach tags to the nearest frame timestamps above.`
    : "";

  const eventsBlock = formatFilmEventsForPrompt(options?.filmEvents ?? []);
  const eventsSection = eventsBlock
    ? `\n\n${eventsBlock}\nWhen coach tags conflict with your read, prefer the tags and explain how the frames support them.`
    : "";

  const patternCounterGuide = buildPatternCounterPromptSection();

  return `You are a basketball AI coaching assistant and video scout. Analyze these ${frameCount} sequential frames spanning ~2 seconds of game film (center timestamp ~${Math.round(timestamp)}s). ${titleLine}${frameSequenceSection}${eventsSection}

Identify what the OFFENSE (team with ball) is running and give actionable coaching for OUR team defending or adjusting. Return JSON only:
{
  "summary": "1-2 sentence scout read",
  "tendencies": [
    {
      "kind": "one of: zone, press, blob, slob, ato, transition, halfcourt, other",
      "label": "short label",
      "confidence": 0.0 to 1.0,
      "notes": "specific visual cues you saw"
    }
  ],
  "playPatterns": [
    {
      "tag": "one of: ${PLAY_PATTERN_TAGS.join(", ")}",
      "confidence": 0.0 to 1.0,
      "notes": "why you chose this set/action"
    }
  ],
  "coaching": {
    "alternativeOptions": [${COACHING_ITEM_SCHEMA}],
    "counters": [${COUNTER_ITEM_SCHEMA}],
    "defensiveAdjustments": [${COACHING_ITEM_SCHEMA}],
    "spacingFixes": [${COACHING_ITEM_SCHEMA}],
    "timingCorrections": [${COACHING_ITEM_SCHEMA}]
  }
}

Coaching rules:
- alternativeOptions: 0-2 items — different coverages or play calls to try vs this look.
- counters: 2-3 items REQUIRED when you identify a set/action. Each counter MUST include coverage, targetsPattern, trigger, ballHandlerRule, screenerRule, and weakPoint. Tie every counter to a playPattern you listed.
- defensiveAdjustments: 0-2 items — help-side, nail help, tag roller, deny pass lane.
- spacingFixes: 0-2 items — closeouts, shrink gaps, bump cutters, no open corner.
- timingCorrections: 0-2 items — rotate timing, stunt timing, communicate early.

Counter playbook (use for counters section):
${patternCounterGuide}

Counter quality rules:
- Name counters like a coach ("ICE side PNR", "Switch cross on Horns") — not generic advice.
- ballHandlerRule and screenerRule must be specific (e.g. "BH: force baseline, no middle" / "Big: drop to level of ball").
- weakPoint = what the offense wants (corner three, roller layup, mismatch, etc.).
- Prefer counters that directly answer the highest-confidence playPattern.

Scout rules:
- Return 1-3 tendencies max, highest confidence first.
- Return 0-3 playPatterns max (action/set tags like Horns, PNR, Flare).
- Use tendency kind exactly from: ${kinds}, other.
- Use playPattern tag from the allowed list only.
- If unclear, use kind "other" or omit playPatterns.
- Coaching must be practical for a real bench — short titles, specific details.
- Do not invent player names or scores.`;
}

function normalizeKind(raw: unknown): OpponentTendencyKind {
  const token = String(raw ?? "")
    .trim()
    .toLowerCase();
  return VALID_KINDS.has(token as OpponentTendencyKind)
    ? (token as OpponentTendencyKind)
    : "other";
}

function normalizeConfidence(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function normalizePatternTag(raw: unknown): string | null {
  const token = String(raw ?? "").trim();
  if (!token) return null;
  const lower = token.toLowerCase();
  const match = PLAY_PATTERN_TAGS.find(
    (tag) => tag.toLowerCase() === lower,
  );
  if (match) return match;
  if (lower === "pick and roll" || lower === "ball screen") return "PNR";
  if (lower === "dribble handoff") return "DHO";
  if (lower.includes("horns")) return "Horns";
  if (lower.includes("flare")) return "Flare";
  return null;
}

function normalizePriority(raw: unknown): FilmClipCoachingPriority | undefined {
  const token = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (token === "high" || token === "medium" || token === "low") return token;
  return undefined;
}

function parseCoachingSuggestion(raw: unknown): FilmClipCoachingSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const title =
    typeof item.title === "string" && item.title.trim()
      ? item.title.trim().slice(0, 120)
      : "";
  const detail =
    typeof item.detail === "string" && item.detail.trim()
      ? item.detail.trim().slice(0, 400)
      : "";
  if (!title || !detail) return null;
  const priority = normalizePriority(item.priority);
  return priority ? { title, detail, priority } : { title, detail };
}

export function parseCoachingRecommendations(
  raw: unknown,
  primaryPattern?: string,
): FilmClipCoachingRecommendations {
  const coaching = emptyCoachingRecommendations();
  if (!raw || typeof raw !== "object") return coaching;
  const body = raw as Record<string, unknown>;

  for (const categoryId of COACHING_CATEGORIES) {
    const rows = Array.isArray(body[categoryId]) ? body[categoryId] : [];
    const maxItems = categoryId === "counters" ? 3 : 2;
    for (const row of rows) {
      if (categoryId === "counters") {
        const counter = normalizeCounterSuggestion(row, primaryPattern);
        if (!counter) continue;
        coaching.counters.push(counter);
      } else {
        const item = parseCoachingSuggestion(row);
        if (!item) continue;
        coaching[categoryId].push(item);
      }
      if (coaching[categoryId].length >= maxItems) break;
    }
  }

  return coaching;
}

export function parseFilmClipAnalysisPayload(
  raw: unknown,
): FilmClipAnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const summary =
    typeof body.summary === "string" ? body.summary.trim() : "";
  if (!summary) return null;

  const tendenciesRaw = Array.isArray(body.tendencies) ? body.tendencies : [];
  const tendencies: FilmClipAnalysisTendency[] = [];
  for (const row of tendenciesRaw) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const kind = normalizeKind(item.kind);
    const label =
      typeof item.label === "string" && item.label.trim()
        ? item.label.trim()
        : kind;
    const notes =
      typeof item.notes === "string" && item.notes.trim()
        ? item.notes.trim()
        : undefined;
    tendencies.push({
      kind,
      label,
      confidence: normalizeConfidence(item.confidence),
      notes,
    });
    if (tendencies.length >= 3) break;
  }

  if (!tendencies.length) return null;

  const patternsRaw = Array.isArray(body.playPatterns) ? body.playPatterns : [];
  const playPatterns: FilmClipPlayPattern[] = [];
  const seenTags = new Set<string>();
  for (const row of patternsRaw) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const tag = normalizePatternTag(item.tag);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seenTags.has(key)) continue;
    seenTags.add(key);
    const notes =
      typeof item.notes === "string" && item.notes.trim()
        ? item.notes.trim()
        : undefined;
    playPatterns.push({
      tag,
      confidence: normalizeConfidence(item.confidence),
      notes,
    });
    if (playPatterns.length >= 3) break;
  }

  const coaching = parseCoachingRecommendations(
    body.coaching,
    playPatterns[0]?.tag,
  );

  return { summary, tendencies, playPatterns, coaching };
}
