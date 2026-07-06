import { buildPatternCounterPromptSection } from "@/lib/film-room/film-counter-playbook";
import { parseCoachingRecommendations } from "@/lib/film-room/film-clip-analyze-prompt";
import type { FilmClipCoachingRecommendations } from "@/lib/film-room/film-clip-analyze-types";
import type { DesignerFrame, PlayDocument } from "@/types/designer";
import type { DesignerCoachGamePlanSnapshot } from "@/lib/designer/designer-coach-game-plan";
import {
  buildDesignerCoachGamePlanPromptSection,
} from "@/lib/designer/designer-coach-game-plan";
import { parseAiCoachApplyBundles } from "@/lib/designer/designer-coach-ai-apply";
import type { DesignerCoachApplyBundle } from "@/lib/designer/designer-coach-apply";
import {
  buildDesignerCoachLibraryPromptSection,
  type DesignerCoachLibraryPlaySummary,
} from "@/lib/designer/designer-coach-library-context";

export interface DesignerCoachRequest {
  play: {
    title: string;
    type?: string;
    team?: string;
    series?: string;
    tags?: string[];
    courtType: string;
    playNotes?: string;
  };
  frameIndex: number;
  frame: DesignerFrame;
  gamePlan?: DesignerCoachGamePlanSnapshot;
  libraryContext?: DesignerCoachLibraryPlaySummary[];
}

function summarizeObjects(frame: DesignerFrame) {
  return frame.objects.map((obj) => ({
    kind: obj.kind,
    label: obj.label,
    x: Math.round(obj.x * 1000) / 1000,
    y: Math.round(obj.y * 1000) / 1000,
    hasBall: obj.hasBall ?? false,
    defenseStyle: obj.defenseStyle,
    rotation: obj.rotation,
  }));
}

function summarizeActions(frame: DesignerFrame) {
  const seq = frame.actionSequence ?? frame.actions.map((a) => a.id);
  return seq.map((id) => {
    const action = frame.actions.find((row) => row.id === id);
    if (!action) return null;
    return {
      type: action.type,
      timing: action.timing ?? "normal",
      from: [action.x1, action.y1],
      to: [action.x2, action.y2],
    };
  }).filter(Boolean);
}

export function buildDesignerCoachSnapshot(
  play: PlayDocument,
  frameIndex: number,
  gamePlan?: DesignerCoachGamePlanSnapshot,
  libraryContext?: DesignerCoachLibraryPlaySummary[],
): DesignerCoachRequest {
  const frame = play.frames[frameIndex]!;
  return {
    play: {
      title: play.title,
      type: (play as { type?: string }).type,
      team: (play as { team?: string }).team,
      series: (play as { series?: string }).series,
      tags: (play as { tags?: string[] }).tags,
      courtType: play.courtType,
      playNotes: (play as { playNotes?: string }).playNotes,
    },
    frameIndex,
    frame: {
      id: frame.id,
      name: frame.name,
      objects: frame.objects,
      actions: frame.actions,
      actionSequence: frame.actionSequence,
      notes: frame.notes,
      animDurationSec: frame.animDurationSec,
      readBranch: frame.readBranch,
    },
    gamePlan,
    libraryContext,
  };
}

export function buildDesignerCoachPrompt(snapshot: DesignerCoachRequest): string {
  const frameLabel = snapshot.frame.name?.trim() || `Frame ${snapshot.frameIndex + 1}`;
  const patternGuide = buildPatternCounterPromptSection();

  return `You are a basketball AI coaching assistant inside a play designer.
Analyze this diagram snapshot and return actionable coaching for the coach drawing the play.
Coordinates are normalized 0–1 on the court (0,0 top-left; basket typically toward higher y on half court).

Play: ${snapshot.play.title}
Court: ${snapshot.play.courtType}
Type: ${snapshot.play.type || "play"}
Team: ${snapshot.play.team || "—"}
Series: ${snapshot.play.series || "—"}
Tags: ${(snapshot.play.tags || []).join(", ") || "—"}
Frame: ${frameLabel} (#${snapshot.frameIndex + 1})
Animation duration (sec): ${snapshot.frame.animDurationSec ?? 1}
Players: ${JSON.stringify(summarizeObjects(snapshot.frame))}
Action sequence: ${JSON.stringify(summarizeActions(snapshot.frame))}
Frame notes: ${(snapshot.frame.notes || "").replace(/<[^>]+>/g, " ").trim().slice(0, 400) || "—"}
${
  snapshot.gamePlan
    ? `
Active game plan scout context:
${buildDesignerCoachGamePlanPromptSection(snapshot.gamePlan)}
Bias counters and defensive reads toward this opponent when relevant.`
    : ""
}

Standard counter guide:
${patternGuide}
${
  snapshot.libraryContext?.length
    ? `
${buildDesignerCoachLibraryPromptSection(snapshot.libraryContext)}
When suggesting alternativeOptions, prefer playId values from the library list above when a real play fits.`
    : ""
}

Return JSON only:
{
  "coaching": {
    "alternativeOptions": [{ "title": "...", "detail": "...", "priority": "high|medium|low", "playId": "optional-library-play-id" }],
    "counters": [{
      "title": "...",
      "detail": "...",
      "priority": "high|medium|low",
      "coverage": "ice|switch|drop|blitz|hedge|show|hard_show|peel|cross|zone_bump|trap|switch_cross|other",
      "targetsPattern": "PNR|Horns|Spain|...",
      "trigger": "...",
      "ballHandlerRule": "...",
      "screenerRule": "...",
      "weakPoint": "..."
    }],
    "defensiveAdjustments": [{ "title": "...", "detail": "...", "priority": "..." }],
    "spacingFixes": [{ "title": "...", "detail": "...", "priority": "..." }],
    "timingCorrections": [{ "title": "...", "detail": "...", "priority": "..." }]
  },
  "applyBundles": [{
    "category": "spacingFixes | defensiveAdjustments | timingCorrections",
    "title": "short label",
    "detail": "coach-facing cue",
    "priority": "high | medium | low",
    "fixes": [
      { "type": "move", "objectLabel": "2", "x": 0.35, "y": 0.55 },
      { "type": "addDefense", "x": 0.55, "y": 0.62, "label": "3", "defenseStyle": "mark" },
      { "type": "setDefenseStyle", "objectLabel": "1", "defenseStyle": "guard" },
      { "type": "frameDuration", "seconds": 2.0 },
      { "type": "actionTiming", "actionIndex": 0, "timing": "sync" }
    ]
  }]
}

Include applyBundles only when you can specify normalized 0–1 coordinates and jersey labels shown on the diagram.
Give 1–2 items per category when relevant. Be specific to player positions and actions shown.`;
}

export interface DesignerCoachParseResult {
  coaching: FilmClipCoachingRecommendations | null;
  applyBundles: DesignerCoachApplyBundle[];
  aiLibraryAlternatives: Array<{
    playId: string;
    title: string;
    detail: string;
    priority?: "high" | "medium" | "low";
  }>;
}

function parseAiLibraryAlternatives(
  raw: unknown,
  allowedPlayIds: ReadonlySet<string>,
) {
  if (!raw || typeof raw !== "object") return [];
  const coaching = (raw as Record<string, unknown>).coaching;
  if (!coaching || typeof coaching !== "object") return [];
  const rows = (coaching as Record<string, unknown>).alternativeOptions;
  if (!Array.isArray(rows)) return [];

  const out: DesignerCoachParseResult["aiLibraryAlternatives"] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const playId =
      typeof item.playId === "string" ? item.playId.trim() : "";
    if (!playId || !allowedPlayIds.has(playId) || seen.has(playId)) continue;
    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim()
        : "";
    const detail =
      typeof item.detail === "string" && item.detail.trim()
        ? item.detail.trim()
        : "";
    if (!title || !detail) continue;
    seen.add(playId);
    const priorityRaw = String(item.priority ?? "").trim().toLowerCase();
    const priority =
      priorityRaw === "high" || priorityRaw === "medium" || priorityRaw === "low"
        ? priorityRaw
        : undefined;
    out.push({ playId, title, detail, priority });
  }
  return out;
}

export function parseDesignerCoachPayload(
  raw: unknown,
  frame?: DesignerFrame,
  libraryContext?: DesignerCoachLibraryPlaySummary[],
): DesignerCoachParseResult {
  if (!raw || typeof raw !== "object") {
    return { coaching: null, applyBundles: [], aiLibraryAlternatives: [] };
  }
  const body = raw as Record<string, unknown>;
  const coaching = parseCoachingRecommendations(body.coaching);
  const hasAny = Object.values(coaching).some((rows) => rows.length > 0);
  const applyBundles =
    frame != null ? parseAiCoachApplyBundles(body.applyBundles, frame) : [];
  const allowed = new Set((libraryContext ?? []).map((row) => row.playId));
  const aiLibraryAlternatives = parseAiLibraryAlternatives(body, allowed);
  return {
    coaching: hasAny ? coaching : null,
    applyBundles,
    aiLibraryAlternatives,
  };
}
