import { buildCurvePoints8 } from "@/lib/designer/action-geometry";
import { closestOffenseAt } from "@/lib/designer/action-propagation";
import { applyActionResultsToFrame, objectsAfterFrameActions } from "@/lib/designer/frame-propagation";
import { mergeCourtViewSettings } from "@/lib/designer/court-view-settings";
import { resolvePlaybackSpeed } from "@/lib/designer/animation-timing";
import {
  snapCourtWidthRef,
  snapPassEndpoints,
  resolvePassStartPlayer,
} from "@/lib/designer/player-edge-snap";
import {
  reconcileRosterLabels,
  rosterModeFromLibraryType,
  type DesignerRosterMode,
} from "@/lib/designer/player-limits";
import type {
  ActionType,
  DesignerAction,
  DesignerFrame,
  DesignerObject,
  PlayDocument,
} from "@/types/designer";
import type { LibraryItemType } from "@/types/library";
import type { DesignerState } from "./types";

export function newObjectId() {
  return `obj-${crypto.randomUUID()}`;
}

export function newActionId() {
  return `act-${crypto.randomUUID()}`;
}

export function ensureFrameActions(frame: DesignerFrame): DesignerFrame {
  return {
    ...frame,
    actions: frame.actions ?? [],
    actionSequence: frame.actionSequence ?? (frame.actions ?? []).map((a) => a.id),
  };
}

export function normalizeBallPossession(
  frame: DesignerFrame,
  mode: DesignerRosterMode = "play",
): DesignerFrame {
  if (mode === "drill") return frame;

  const balls = frame.objects.filter((o) => o.kind === "ball");
  let objects = frame.objects.filter((o) => o.kind !== "ball");

  for (const ball of balls) {
    let best: DesignerObject | null = null;
    let bestDist = Infinity;
    for (const o of objects) {
      if (o.kind !== "offense") continue;
      const d = Math.hypot(o.x - ball.x, o.y - ball.y);
      if (d < bestDist) {
        bestDist = d;
        best = o;
      }
    }
    if (best && bestDist < 0.1) {
      objects = objects.map((o) =>
        o.id === best!.id ? { ...o, hasBall: true } : o,
      );
    }
  }

  let ballHolder = false;
  objects = objects.map((o) => {
    if (o.kind !== "offense" || !o.hasBall) return o;
    if (ballHolder) return { ...o, hasBall: false };
    ballHolder = true;
    return o;
  });

  return { ...frame, objects };
}

export function normalizeFrameRosterLabels(
  frame: DesignerFrame,
  mode: DesignerRosterMode = "play",
): DesignerFrame {
  return {
    ...frame,
    objects: reconcileRosterLabels(frame.objects, mode),
  };
}

export function normalizeLoadedPlay(
  play: PlayDocument,
  libraryItemType: LibraryItemType = "play",
): PlayDocument {
  const mode = rosterModeFromLibraryType(libraryItemType);
  return {
    ...play,
    courtView: mergeCourtViewSettings(play.courtView),
    frames: play.frames.map((frame) =>
      normalizeFrameRosterLabels(
        normalizeBallPossession(ensureFrameActions(frame), mode),
        mode,
      ),
    ),
    animSpeed: resolvePlaybackSpeed(play.animSpeed),
    animPauseMs: play.animPauseMs ?? 800,
  };
}

export function cloneAction(action: DesignerAction): DesignerAction {
  return {
    ...action,
    id: newActionId(),
    points: action.points ? [...action.points] : undefined,
  };
}

export function appendToSequence(frame: DesignerFrame, actionId: string) {
  const seq = [...(frame.actionSequence ?? frame.actions.map((a) => a.id))];
  if (!seq.includes(actionId)) seq.push(actionId);
  return seq;
}

export function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export function propagateDirtyFramesForward(
  play: PlayDocument,
  fromIndex: number,
  toIndex: number,
): PlayDocument {
  let frames = [...play.frames];
  for (let i = fromIndex; i < toIndex; i++) {
    const source = frames[i];
    const target = frames[i + 1];
    if (!source || !target) break;
    frames = [...frames];
    frames[i + 1] = applyActionResultsToFrame(source, target);
  }
  return { ...play, frames };
}

export function snapContextObjects(frame: DesignerFrame) {
  return objectsAfterFrameActions(frame);
}

export function snapPassActionPatch(
  action: DesignerAction,
  patch: Partial<DesignerAction>,
  frame: DesignerFrame,
  courtWidthPx?: number,
): Partial<DesignerAction> {
  const merged = { ...action, ...patch };
  const snapped = snapPassEndpoints(
    merged.x1,
    merged.y1,
    merged.x2,
    merged.y2,
    objectsAfterFrameActions(frame, { beforeActionId: action.id }),
    frame.actions.filter((a) => a.id !== action.id),
    courtWidthPx,
  );
  return {
    ...patch,
    x1: snapped.x1,
    y1: snapped.y1,
    x2: snapped.x2,
    y2: snapped.y2,
    midX: (snapped.x1 + snapped.x2) / 2,
    midY: (snapped.y1 + snapped.y2) / 2,
  };
}

export function currentFrame(state: DesignerState) {
  return state.play.frames[state.currentFrameIndex];
}

export function clonePlayDocument(play: PlayDocument): PlayDocument {
  return JSON.parse(JSON.stringify(play)) as PlayDocument;
}

export function defaultCourtZoom(courtType: PlayDocument["courtType"]) {
  return courtType === "full" ? 95 : 90;
}

export function pushUndoSnapshot(state: DesignerState): Partial<DesignerState> {
  const stack = [...(state.undoStack ?? []), clonePlayDocument(state.play)].slice(
    -40,
  );
  return { undoStack: stack, redoStack: [] };
}

export function updateCurrentFrame(
  state: DesignerState,
  updater: (frame: DesignerFrame) => DesignerFrame,
  options?: { recordUndo?: boolean },
): Partial<DesignerState> {
  const frame = currentFrame(state);
  if (!frame) return {};
  const undoPatch = options?.recordUndo ? pushUndoSnapshot(state) : {};
  const frames = [...state.play.frames];
  frames[state.currentFrameIndex] = updater(frame);
  return { ...undoPatch, play: { ...state.play, frames } };
}

export function offenseFromSpots(
  spots: ReadonlyArray<{ num: number; nx: number; ny: number; hasBall?: boolean }>,
) {
  return spots.map((spot) => ({
    id: newObjectId(),
    kind: "offense" as const,
    x: clamp01(spot.nx),
    y: clamp01(spot.ny),
    label: String(spot.num),
    hasBall: !!spot.hasBall,
  }));
}

export function replaceOffensePlayers(
  frame: DesignerFrame,
  spots: ReturnType<typeof offenseFromSpots>,
) {
  const others = frame.objects.filter((o) => o.kind !== "offense" && o.kind !== "ball");
  return { ...frame, objects: [...others, ...spots] };
}

function countExplicitBallHolders(frame: DesignerFrame) {
  return frame.objects.filter((o) => o.kind === "offense" && o.hasBall).length;
}

function countBallHolders(objects: DesignerObject[]) {
  return objects.filter((o) => o.kind === "offense" && o.hasBall).length;
}

export function passSourcePlayerExtra(
  type: ActionType,
  drawX1: number,
  drawY1: number,
  snapObjects: DesignerObject[],
): Partial<DesignerAction> {
  if (type !== "pass" || countBallHolders(snapObjects) <= 1) return {};
  const source = resolvePassStartPlayer(drawX1, drawY1, snapObjects);
  return source ? { sourcePlayerId: source.id } : {};
}

export function syncBallToActionStart(
  frame: DesignerFrame,
  action: DesignerAction,
  mode: DesignerRosterMode = "play",
): DesignerFrame {
  if (
    action.type !== "dribble" &&
    action.type !== "pass" &&
    action.type !== "handoff" &&
    action.type !== "shoot"
  ) {
    return frame;
  }
  if (mode === "drill" && countExplicitBallHolders(frame) > 1) {
    return frame;
  }
  if (countExplicitBallHolders(frame) > 1) {
    return frame;
  }
  const player =
    action.type === "dribble" ||
    action.type === "handoff" ||
    action.type === "pass"
      ? (frame.objects.find((o) => o.kind === "offense" && o.hasBall) ??
        closestOffenseAt(action.x1, action.y1, frame.objects))
      : closestOffenseAt(action.x1, action.y1, frame.objects);
  if (!player) return frame;
  if (mode === "drill") {
    return {
      ...frame,
      objects: frame.objects.map((o) =>
        o.id === player.id && o.kind === "offense"
          ? { ...o, hasBall: true }
          : o,
      ),
    };
  }
  return {
    ...frame,
    objects: frame.objects.map((o) =>
      o.kind === "offense" ? { ...o, hasBall: o.id === player.id } : o,
    ),
  };
}

export function appendActionToFrame(
  frame: DesignerFrame,
  action: DesignerAction,
  mode: DesignerRosterMode,
): DesignerFrame {
  let actions = [...frame.actions];
  if (action.type === "shoot") actions = actions.filter((a) => a.type !== "shoot");
  actions.push(action);
  if (
    mode === "drill" &&
    action.type === "pass" &&
    countExplicitBallHolders(frame) > 1
  ) {
    actions = actions.map((a) =>
      a.type === "pass" ? { ...a, timing: "sync" } : a,
    );
  }
  const next = syncBallToActionStart(
    {
      ...frame,
      actions,
      actionSequence: appendToSequence(frame, action.id),
    },
    action,
    mode,
  );
  return next;
}

export function buildActionFromEndpoints(
  type: ActionType,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeWidth: number,
  extra: Partial<DesignerAction> = {},
): DesignerAction {
  const cx1 = clamp01(x1);
  const cy1 = clamp01(y1);
  const cx2 = clamp01(x2);
  const cy2 = clamp01(y2);
  const curve =
    type === "cut" || type === "curl" || type === "screen"
      ? buildCurvePoints8(cx1, cy1, cx2, cy2, type)
      : null;

  return {
    id: newActionId(),
    type,
    x1: cx1,
    y1: cy1,
    x2: cx2,
    y2: cy2,
    midX: curve ? clamp01((curve[2] + curve[4]) / 2) : clamp01((x1 + x2) / 2),
    midY: curve ? clamp01((curve[3] + curve[5]) / 2) : clamp01((y1 + y2) / 2),
    c1x: curve ? clamp01(curve[2]) : extra.c1x,
    c1y: curve ? clamp01(curve[3]) : extra.c1y,
    c2x: curve ? clamp01(curve[4]) : extra.c2x,
    c2y: curve ? clamp01(curve[5]) : extra.c2y,
    strokeWidth,
    timing: "normal",
    ...extra,
  };
}

export function withDrawColor(
  state: DesignerState,
  extra: Partial<DesignerAction> = {},
): Partial<DesignerAction> {
  return { color: state.lineColor, ...extra };
}

export function designerSnapCourtWidth(state: DesignerState) {
  return state.courtSnapWidthPx > 0
    ? state.courtSnapWidthPx
    : snapCourtWidthRef(state.play.courtType);
}
