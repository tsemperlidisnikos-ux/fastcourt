import {
  clampNorm,
  coachDefenseObjectId,
  type DesignerCoachApplyBundle,
  type DesignerCoachFix,
} from "@/lib/designer/designer-coach-apply";
import type { DefenseMarkerStyle } from "@/lib/designer/defense-marker-style";
import { nextAvailableJersey } from "@/lib/designer/player-limits";
import type {
  FilmClipCoachingCategoryId,
  FilmClipCoachingPriority,
} from "@/lib/film-room/film-clip-analyze-types";
import type { ActionTiming, DesignerFrame } from "@/types/designer";

const VALID_CATEGORIES = new Set<FilmClipCoachingCategoryId>([
  "spacingFixes",
  "defensiveAdjustments",
  "timingCorrections",
]);

function normalizePriority(raw: unknown): FilmClipCoachingPriority | undefined {
  const token = String(raw ?? "").trim().toLowerCase();
  if (token === "high" || token === "medium" || token === "low") return token;
  return undefined;
}

function findObjectByLabel(frame: DesignerFrame, labelRaw: unknown) {
  const label = String(labelRaw ?? "").trim();
  if (!label) return null;
  const normalized = label.replace(/^x/i, "");
  return (
    frame.objects.find((object) => {
      if (object.kind !== "offense" && object.kind !== "defense") return false;
      const objectLabel = String(object.label ?? "").replace(/^x/i, "");
      return objectLabel === normalized;
    }) ?? null
  );
}

function parseDefenseStyle(raw: unknown): DefenseMarkerStyle {
  return String(raw ?? "").trim().toLowerCase() === "guard" ? "guard" : "mark";
}

function parseActionTiming(raw: unknown): ActionTiming | null {
  const token = String(raw ?? "").trim().toLowerCase();
  if (token === "normal" || token === "optional" || token === "sync") {
    return token;
  }
  return null;
}

export function parseAiCoachFix(
  raw: unknown,
  frame: DesignerFrame,
  keyPrefix: string,
  index: number,
): DesignerCoachFix | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = String(row.type ?? "").trim();

  switch (type) {
    case "move": {
      const object = findObjectByLabel(frame, row.objectLabel ?? row.label);
      if (!object) return null;
      const x = Number(row.x);
      const y = Number(row.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        type: "move",
        objectId: object.id,
        x: clampNorm(x),
        y: clampNorm(y),
      };
    }
    case "addDefense": {
      const x = Number(row.x);
      const y = Number(row.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const label =
        String(row.label ?? "").trim() ||
        nextAvailableJersey(frame.objects, "defense") ||
        "1";
      return {
        type: "addDefense",
        objectId: coachDefenseObjectId(`${keyPrefix}-${index}`),
        x: clampNorm(x),
        y: clampNorm(y),
        label,
        defenseStyle: parseDefenseStyle(row.defenseStyle),
        rotation:
          row.rotation != null && Number.isFinite(Number(row.rotation))
            ? Number(row.rotation)
            : undefined,
      };
    }
    case "setDefenseStyle": {
      const object = findObjectByLabel(frame, row.objectLabel ?? row.label);
      if (!object || object.kind !== "defense") return null;
      return {
        type: "setDefenseStyle",
        objectId: object.id,
        defenseStyle: parseDefenseStyle(row.defenseStyle),
        rotation:
          row.rotation != null && Number.isFinite(Number(row.rotation))
            ? Number(row.rotation)
            : undefined,
      };
    }
    case "frameDuration": {
      const seconds = Number(row.seconds);
      if (!Number.isFinite(seconds)) return null;
      return { type: "frameDuration", seconds };
    }
    case "actionTiming": {
      const timing = parseActionTiming(row.timing);
      if (!timing) return null;
      const seq = frame.actionSequence ?? frame.actions.map((action) => action.id);
      let actionId = typeof row.actionId === "string" ? row.actionId : "";
      if (!actionId && row.actionIndex != null) {
        const index = Number(row.actionIndex);
        if (Number.isInteger(index) && index >= 0 && index < seq.length) {
          actionId = seq[index] ?? "";
        }
      }
      if (!actionId) {
        const actionType = String(row.actionType ?? "").trim().toLowerCase();
        actionId =
          frame.actions.find((action) => action.type === actionType)?.id ?? "";
      }
      if (!actionId) return null;
      return { type: "actionTiming", actionId, timing };
    }
    default:
      return null;
  }
}

export function parseAiCoachApplyBundles(
  raw: unknown,
  frame: DesignerFrame,
): DesignerCoachApplyBundle[] {
  if (!Array.isArray(raw)) return [];

  const bundles: DesignerCoachApplyBundle[] = [];
  raw.forEach((entry, bundleIndex) => {
    if (!entry || typeof entry !== "object") return;
    const row = entry as Record<string, unknown>;
    const category = String(row.category ?? "").trim() as FilmClipCoachingCategoryId;
    if (!VALID_CATEGORIES.has(category)) return;

    const title = String(row.title ?? "").trim();
    const detail = String(row.detail ?? "").trim();
    if (!title || !detail) return;

    const keyPrefix = `ai-${bundleIndex}`;
    const fixes: DesignerCoachFix[] = [];
    if (Array.isArray(row.fixes)) {
      row.fixes.forEach((fixRaw, fixIndex) => {
        const fix = parseAiCoachFix(fixRaw, frame, keyPrefix, fixIndex);
        if (fix) fixes.push(fix);
      });
    }

    bundles.push({
      key: `ai-bundle-${bundleIndex}`,
      category,
      title,
      detail,
      priority: normalizePriority(row.priority),
      fixes,
    });
  });

  return bundles.slice(0, 6);
}
