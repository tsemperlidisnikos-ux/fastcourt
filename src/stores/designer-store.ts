"use client";

import { create } from "zustand";
import {
  DEFAULT_LINE_THICKNESS,
  MIN_ACTION_LENGTH_NORM,
} from "@/lib/designer/action-constants";
import { convertActionType } from "@/lib/designer/action-convert";
import { buildCurvePoints8 } from "@/lib/designer/action-geometry";
import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
import { closestOffenseAt } from "@/lib/designer/action-propagation";
import { snapPassEndpoints } from "@/lib/designer/player-edge-snap";
import {
  mirrorFrameHorizontal,
  mirrorPlayHorizontal,
} from "@/lib/designer/mirror-frame";
import {
  curveMidFromFlat,
  dribbleMidFromFlat,
  freehandEndpoints,
  isFreehandStroke,
  prepareFreehandPath,
} from "@/lib/designer/freehand-geometry";
import {
  canPlaceRosterPlayer,
  nextAvailableJersey,
} from "@/lib/designer/player-limits";
import { filterWhiteboardStrokesAt } from "@/lib/designer/whiteboard-eraser";
import {
  getShadowDimensions,
  shadowNormSize,
  shadowPlacementFromNormDrag,
  type ShadowType,
} from "@/lib/designer/shadow-geometry";
import {
  getZoneDimensions,
  zoneNormSize,
  zonePlacementFromNormDrag,
  type ZoneType,
} from "@/lib/designer/zone-geometry";
import {
  FORMATION_PRESETS,
  FIVE_OUT_SPACING,
  type FormationKey,
} from "@/lib/designer/formations";
import { createBlankPlay, createFrame, createPlayFromLibraryItem } from "@/lib/designer/play-factory";
import { useSettingsStore } from "@/stores/settings-store";
import type {
  ActionTiming,
  ActionType,
  CourtType,
  DesignerAction,
  DesignerFrame,
  DesignerObject,
  DesignerTool,
  ObjectKind,
  PlayDocument,
} from "@/types/designer";

function newObjectId() {
  return `obj-${crypto.randomUUID()}`;
}

function newActionId() {
  return `act-${crypto.randomUUID()}`;
}

function ensureFrameActions(frame: DesignerFrame): DesignerFrame {
  return {
    ...frame,
    actions: frame.actions ?? [],
    actionSequence: frame.actionSequence ?? (frame.actions ?? []).map((a) => a.id),
  };
}

function normalizeBallPossession(frame: DesignerFrame): DesignerFrame {
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

function normalizeLoadedPlay(play: PlayDocument): PlayDocument {
  return {
    animSpeed: play.animSpeed ?? 1,
    animPauseMs: play.animPauseMs ?? 800,
    ...play,
    frames: play.frames.map((frame) =>
      normalizeBallPossession(ensureFrameActions(frame)),
    ),
  };
}

function cloneAction(action: DesignerAction): DesignerAction {
  return {
    ...action,
    id: newActionId(),
    points: action.points ? [...action.points] : undefined,
  };
}

function appendToSequence(frame: DesignerFrame, actionId: string) {
  const seq = [...(frame.actionSequence ?? frame.actions.map((a) => a.id))];
  if (!seq.includes(actionId)) seq.push(actionId);
  return seq;
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function propagateDirtyFramesForward(
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

function snapPassActionPatch(
  action: DesignerAction,
  patch: Partial<DesignerAction>,
  frame: DesignerFrame,
): Partial<DesignerAction> {
  const merged = { ...action, ...patch };
  const snapped = snapPassEndpoints(
    merged.x1,
    merged.y1,
    merged.x2,
    merged.y2,
    frame.objects,
    frame.actions.filter((a) => a.id !== action.id),
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

interface DesignerState {
  play: PlayDocument;
  currentFrameIndex: number;
  undoStack: PlayDocument[];
  redoStack: PlayDocument[];
  courtZoom: number;
  tool: DesignerTool;
  lineActionType: ActionType;
  lineThickness: number;
  lineDraft: DesignerAction | null;
  freehandDraft: number[] | null;
  activeShadowType: ShadowType;
  shadowDraft: { x1: number; y1: number; x2: number; y2: number } | null;
  activeZoneType: ZoneType;
  zoneDraft: { x1: number; y1: number; x2: number; y2: number } | null;
  selectedActionId: string | null;
  selectedObjectId: string | null;
  animRuntime: {
    active: boolean;
    objects: DesignerObject[];
    activeActionId: string | null;
    revealedActionIds: string[];
    lineProgress: number;
  } | null;
  frameActionsDirty: boolean;
  loadPlay: (play: PlayDocument) => void;
  loadFromLibraryItem: (itemId: string, title: string) => void;
  setTool: (tool: DesignerTool) => void;
  setLineActionType: (type: ActionType) => void;
  setLineThickness: (value: number) => void;
  setCourtType: (courtType: CourtType) => void;
  setTitle: (title: string) => void;
  setAnimSpeed: (value: number) => void;
  setAnimPauseMs: (value: number) => void;
  selectFrame: (index: number) => void;
  prevFrame: () => void;
  nextFrame: () => void;
  setFrameName: (name: string) => void;
  addFrame: () => void;
  duplicateFrame: () => void;
  deleteFrame: () => void;
  clearFrame: () => void;
  whiteboardInkColor: string;
  whiteboardInkMode: "draw" | "erase";
  whiteboardErasing: boolean;
  setWhiteboardInkColor: (color: string) => void;
  setWhiteboardInkMode: (mode: "draw" | "erase") => void;
  commitWhiteboardStroke: (points: number[]) => void;
  eraseWhiteboardAt: (x: number, y: number) => void;
  finishWhiteboardErase: () => void;
  clearWhiteboardStrokes: () => void;
  placeObject: (kind: ObjectKind, x: number, y: number) => void;
  setShadowType: (type: ShadowType) => void;
  beginShadowDraft: (x: number, y: number) => void;
  updateShadowDraft: (x: number, y: number) => void;
  commitShadowDraft: () => void;
  cancelShadowDraft: () => void;
  setZoneType: (type: ZoneType) => void;
  beginZoneDraft: (x: number, y: number) => void;
  updateZoneDraft: (x: number, y: number) => void;
  commitZoneDraft: () => void;
  cancelZoneDraft: () => void;
  selectObject: (objectId: string | null) => void;
  resizeObjectScales: (objectId: string, scaleX: number, scaleY: number) => void;
  assignPlayerBall: (objectId: string) => void;
  moveObject: (objectId: string, x: number, y: number) => void;
  removeObject: (objectId: string) => void;
  beginLineDraft: (x: number, y: number) => void;
  updateLineDraft: (x: number, y: number) => void;
  commitLineDraft: () => void;
  cancelLineDraft: () => void;
  beginFreehandDraft: (x: number, y: number) => void;
  appendFreehandDraftPoint: (x: number, y: number) => void;
  finishFreehandDraft: () => void;
  cancelFreehandDraft: () => void;
  setAnimRuntime: (
    state: DesignerState["animRuntime"],
  ) => void;
  selectAction: (actionId: string | null) => void;
  updateAction: (
    actionId: string,
    patch: Partial<DesignerAction>,
    options?: { recordUndo?: boolean },
  ) => void;
  changeActionType: (actionId: string, type: ActionType) => void;
  removeAction: (actionId: string) => void;
  setActionTiming: (actionId: string, timing: ActionTiming) => void;
  reorderActionSequence: (fromIndex: number, toIndex: number) => void;
  applyFormation: (key: FormationKey) => void;
  fastBuildFiveOut: () => void;
  zoomCourtIn: () => void;
  zoomCourtOut: () => void;
  resetCourtZoom: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setFrameNotes: (notes: string) => void;
  mirrorCurrentFrame: () => void;
  mirrorEntirePlay: () => void;
  replaceCurrentFrame: (frame: DesignerFrame) => void;
}

function currentFrame(state: DesignerState) {
  return state.play.frames[state.currentFrameIndex];
}

function clonePlayDocument(play: PlayDocument): PlayDocument {
  return JSON.parse(JSON.stringify(play)) as PlayDocument;
}

function defaultCourtZoom(courtType: PlayDocument["courtType"]) {
  return courtType === "full" ? 95 : 90;
}

function pushUndoSnapshot(state: DesignerState): Partial<DesignerState> {
  const stack = [...(state.undoStack ?? []), clonePlayDocument(state.play)].slice(
    -40,
  );
  return { undoStack: stack, redoStack: [] };
}

function updateCurrentFrame(
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

function offenseFromSpots(
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

function replaceOffensePlayers(frame: DesignerFrame, spots: ReturnType<typeof offenseFromSpots>) {
  const others = frame.objects.filter((o) => o.kind !== "offense" && o.kind !== "ball");
  return { ...frame, objects: [...others, ...spots] };
}

function syncBallToActionStart(
  frame: DesignerFrame,
  action: DesignerAction,
): DesignerFrame {
  if (
    action.type !== "dribble" &&
    action.type !== "pass" &&
    action.type !== "handoff" &&
    action.type !== "shoot"
  ) {
    return frame;
  }
  const player = closestOffenseAt(action.x1, action.y1, frame.objects);
  if (!player) return frame;
  return {
    ...frame,
    objects: frame.objects.map((o) =>
      o.kind === "offense" ? { ...o, hasBall: o.id === player.id } : o,
    ),
  };
}

function appendActionToFrame(
  frame: DesignerFrame,
  action: DesignerAction,
): DesignerFrame {
  let actions = [...frame.actions];
  if (action.type === "shoot") actions = actions.filter((a) => a.type !== "shoot");
  actions.push(action);
  return syncBallToActionStart(
    {
      ...frame,
      actions,
      actionSequence: appendToSequence(frame, action.id),
    },
    action,
  );
}

function buildActionFromEndpoints(
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

export const useDesignerStore = create<DesignerState>((set, get) => ({
  play: createBlankPlay(),
  currentFrameIndex: 0,
  tool: "offense",
  lineActionType: "cut",
  lineThickness: DEFAULT_LINE_THICKNESS,
  lineDraft: null,
  freehandDraft: null,
  activeShadowType: "rect",
  shadowDraft: null,
  activeZoneType: "paint",
  zoneDraft: null,
  selectedActionId: null,
  selectedObjectId: null,
  animRuntime: null,
  frameActionsDirty: false,
  whiteboardInkColor: "#000000",
  whiteboardInkMode: "draw",
  whiteboardErasing: false,
  undoStack: [],
  redoStack: [],
  courtZoom: 90,

  loadPlay: (play) => {
    const normalized = normalizeLoadedPlay(play);
    const prefsZoom = useSettingsStore.getState().designer.defaultCourtZoom;
    set({
      play: normalized,
      currentFrameIndex: 0,
      lineDraft: null,
      freehandDraft: null,
      selectedActionId: null,
      frameActionsDirty: false,
      undoStack: [],
      redoStack: [],
      courtZoom: prefsZoom || defaultCourtZoom(normalized.courtType),
    });
  },

  loadFromLibraryItem: (itemId, title) => {
    const play = createPlayFromLibraryItem(itemId, title);
    set({
      play,
      currentFrameIndex: 0,
      lineDraft: null,
      freehandDraft: null,
      selectedActionId: null,
      frameActionsDirty: false,
      undoStack: [],
      redoStack: [],
      courtZoom: defaultCourtZoom(play.courtType),
    });
  },

  setTool: (tool) =>
    set({
      tool,
      lineDraft: null,
      freehandDraft: null,
      animRuntime: null,
      whiteboardInkMode: tool === "whiteboard" ? get().whiteboardInkMode : "draw",
      whiteboardErasing: false,
      selectedActionId:
        tool === "select" || tool === "line" || tool === "shoot"
          ? get().selectedActionId
          : null,
      selectedObjectId:
        tool === "select" || tool === "line" || tool === "shoot"
          ? get().selectedObjectId
          : null,
    }),

  setLineActionType: (type) => set({ lineActionType: type }),
  setLineThickness: (value) =>
    set({ lineThickness: Math.min(8, Math.max(1, Math.round(value))) }),

  setCourtType: (courtType) =>
    set((state) => ({
      play: { ...state.play, courtType },
      lineDraft: null,
      freehandDraft: null,
    })),

  setTitle: (title) => set((state) => ({ play: { ...state.play, title } })),
  setAnimSpeed: (value) =>
    set((state) => ({ play: { ...state.play, animSpeed: value } })),
  setAnimPauseMs: (value) =>
    set((state) => ({ play: { ...state.play, animPauseMs: value } })),

  selectFrame: (index) =>
    set((state) => {
      if (index < 0 || index >= state.play.frames.length) return state;
      let play = state.play;
      let frameActionsDirty = state.frameActionsDirty;
      if (index > state.currentFrameIndex && state.frameActionsDirty) {
        play = propagateDirtyFramesForward(
          play,
          state.currentFrameIndex,
          index,
        );
        frameActionsDirty = false;
      }
      return {
        play,
        currentFrameIndex: index,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
        frameActionsDirty,
      };
    }),

  prevFrame: () => {
    const { currentFrameIndex } = get();
    if (currentFrameIndex > 0) {
      set({
        currentFrameIndex: currentFrameIndex - 1,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
      });
    }
  },

  nextFrame: () =>
    set((state) => {
      if (state.currentFrameIndex >= state.play.frames.length - 1) return state;
      let play = state.play;
      let frameActionsDirty = state.frameActionsDirty;
      if (state.frameActionsDirty) {
        play = propagateDirtyFramesForward(
          play,
          state.currentFrameIndex,
          state.currentFrameIndex + 1,
        );
        frameActionsDirty = false;
      }
      return {
        play,
        currentFrameIndex: state.currentFrameIndex + 1,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
        frameActionsDirty,
      };
    }),

  setFrameName: (name) =>
    set((state) => {
      const idx = state.currentFrameIndex;
      const frame = state.play.frames[idx];
      if (!frame) return state;
      const frames = [...state.play.frames];
      frames[idx] = { ...frame, name: name.trim() || frame.name };
      return { play: { ...state.play, frames } };
    }),

  addFrame: () =>
    set((state) => {
      const source = state.play.frames[state.currentFrameIndex];
      if (!source) return state;
      const nextIndex = state.play.frames.length + 1;
      const draft: DesignerFrame = {
        ...createFrame(`Frame ${nextIndex}`, nextIndex),
        objects: source.objects.map((o) => ({ ...o, id: newObjectId() })),
      };
      const frame = applyActionResultsToFrame(source, draft, {
        clearActions: true,
      });
      return {
        ...pushUndoSnapshot(state),
        play: { ...state.play, frames: [...state.play.frames, frame] },
        currentFrameIndex: state.play.frames.length,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
        frameActionsDirty: false,
      };
    }),

  duplicateFrame: () =>
    set((state) => {
      const source = state.play.frames[state.currentFrameIndex];
      if (!source) return state;
      const idMap = new Map<string, string>();
      const actions = (source.actions ?? []).map((a) => {
        const copy = cloneAction(a);
        idMap.set(a.id, copy.id);
        return copy;
      });
      const copy: DesignerFrame = {
        ...source,
        id: `frame-${crypto.randomUUID()}`,
        name: `${source.name} copy`,
        objects: source.objects.map((o) => ({ ...o, id: newObjectId() })),
        actions,
        actionSequence: (source.actionSequence ?? source.actions.map((a) => a.id))
          .map((id) => idMap.get(id) ?? id)
          .filter((id) => actions.some((a) => a.id === id)),
      };
      const frames = [...state.play.frames];
      frames.splice(state.currentFrameIndex + 1, 0, copy);
      return {
        ...pushUndoSnapshot(state),
        play: { ...state.play, frames },
        currentFrameIndex: state.currentFrameIndex + 1,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
      };
    }),

  clearFrame: () =>
    set((state) => ({
      ...updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: [],
          actions: [],
          actionSequence: [],
          whiteboardStrokes: [],
        }),
        { recordUndo: true },
      ),
      lineDraft: null,
      freehandDraft: null,
      selectedActionId: null,
      frameActionsDirty: true,
    })),

  deleteFrame: () =>
    set((state) => {
      if (state.play.frames.length <= 1) return state;
      const frames = state.play.frames.filter(
        (_, i) => i !== state.currentFrameIndex,
      );
      const nextIndex = Math.min(state.currentFrameIndex, frames.length - 1);
      return {
        ...pushUndoSnapshot(state),
        play: { ...state.play, frames },
        currentFrameIndex: nextIndex,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
      };
    }),

  setWhiteboardInkColor: (color) => set({ whiteboardInkColor: color }),

  setWhiteboardInkMode: (mode) =>
    set({
      whiteboardInkMode: mode,
      whiteboardErasing: false,
    }),

  commitWhiteboardStroke: (points) =>
    set((state) => {
      if (points.length < 4) return state;
      const stroke = {
        points: points.map(clamp01),
        color: state.whiteboardInkColor,
        width: 3,
      };
      return updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          whiteboardStrokes: [...(f.whiteboardStrokes ?? []), stroke],
        }),
        { recordUndo: true },
      );
    }),

  eraseWhiteboardAt: (x, y) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      const current = frame.whiteboardStrokes ?? [];
      const next = filterWhiteboardStrokesAt(current, x, y);
      if (next.length === current.length) return state;
      const recordUndo = !state.whiteboardErasing;
      return {
        ...updateCurrentFrame(
          state,
          (f) => ({ ...f, whiteboardStrokes: next }),
          { recordUndo },
        ),
        whiteboardErasing: true,
      };
    }),

  finishWhiteboardErase: () => set({ whiteboardErasing: false }),

  clearWhiteboardStrokes: () =>
    set((state) =>
      updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          whiteboardStrokes: [],
        }),
        { recordUndo: true },
      ),
    ),

  placeObject: (kind, x, y) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      if (!canPlaceRosterPlayer(frame.objects, kind)) return state;

      let label: string | undefined;
      if (kind === "offense" || kind === "defense") {
        label = nextAvailableJersey(frame.objects, kind) ?? undefined;
        if (!label) return state;
      } else if (kind === "text") {
        label = "Text";
      } else if (kind === "label") {
        label = "Label";
      }

      const object: DesignerObject = {
        id: newObjectId(),
        kind,
        x: clamp01(x),
        y: clamp01(y),
        label,
        ...(kind === "zone" ? { w: 0.12, h: 0.1 } : {}),
      };
      return updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: [...f.objects, object],
        }),
        { recordUndo: true },
      );
    }),

  setShadowType: (type) => set({ activeShadowType: type }),

  beginShadowDraft: (x, y) =>
    set({ shadowDraft: { x1: x, y1: y, x2: x, y2: y } }),

  updateShadowDraft: (x, y) =>
    set((state) => {
      if (!state.shadowDraft) return state;
      return { shadowDraft: { ...state.shadowDraft, x2: x, y2: y } };
    }),

  commitShadowDraft: () =>
    set((state) => {
      const draft = state.shadowDraft;
      if (!draft) return state;
      const court = { x: 0, y: 0, width: 1, height: 1 };
      const placement = shadowPlacementFromNormDrag(
        state.activeShadowType,
        court,
        draft.x1,
        draft.y1,
        draft.x2,
        draft.y2,
      );
      const dims = getShadowDimensions(court);
      const size = shadowNormSize(
        state.activeShadowType,
        dims,
        placement.scaleX,
        placement.scaleY,
        court,
      );
      const object: DesignerObject = {
        id: newObjectId(),
        kind: "shadow",
        x: clamp01(placement.x),
        y: clamp01(placement.y),
        shadowType: state.activeShadowType,
        scaleX: placement.scaleX,
        scaleY: placement.scaleY,
        w: size.w,
        h: size.h,
      };
      return updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: [...f.objects, object],
          shadowDraft: null,
        }),
        { recordUndo: true },
      );
    }),

  cancelShadowDraft: () => set({ shadowDraft: null }),

  setZoneType: (type) => set({ activeZoneType: type }),

  beginZoneDraft: (x, y) =>
    set({ zoneDraft: { x1: x, y1: y, x2: x, y2: y } }),

  updateZoneDraft: (x, y) =>
    set((state) => {
      if (!state.zoneDraft) return state;
      return { zoneDraft: { ...state.zoneDraft, x2: x, y2: y } };
    }),

  commitZoneDraft: () =>
    set((state) => {
      const draft = state.zoneDraft;
      if (!draft) return state;
      const court = { x: 0, y: 0, width: 1, height: 1 };
      const placement = zonePlacementFromNormDrag(
        state.activeZoneType,
        court,
        draft.x1,
        draft.y1,
        draft.x2,
        draft.y2,
      );
      const dims = getZoneDimensions(court, state.activeZoneType);
      const size = zoneNormSize(
        dims,
        placement.scaleX,
        placement.scaleY,
        court,
      );
      const object: DesignerObject = {
        id: newObjectId(),
        kind: "zone",
        x: clamp01(placement.x),
        y: clamp01(placement.y),
        zoneType: state.activeZoneType,
        scaleX: placement.scaleX,
        scaleY: placement.scaleY,
        w: size.w,
        h: size.h,
      };
      return updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: [...f.objects, object],
          zoneDraft: null,
        }),
        { recordUndo: true },
      );
    }),

  cancelZoneDraft: () => set({ zoneDraft: null }),

  selectObject: (objectId) =>
    set({ selectedObjectId: objectId, selectedActionId: null }),

  resizeObjectScales: (objectId, scaleX, scaleY) =>
    set((state) => {
      const court = { x: 0, y: 0, width: 1, height: 1 };
      return updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: f.objects.map((o) => {
            if (o.id !== objectId) return o;
            if (o.kind === "shadow") {
              const shadowType = o.shadowType ?? "rect";
              const dims = getShadowDimensions(court);
              const size = shadowNormSize(
                shadowType,
                dims,
                scaleX,
                scaleY,
                court,
              );
              return { ...o, scaleX, scaleY, w: size.w, h: size.h };
            }
            if (o.kind === "zone") {
              const zoneType = o.zoneType ?? "paint";
              const dims = getZoneDimensions(court, zoneType);
              const size = zoneNormSize(dims, scaleX, scaleY, court);
              return { ...o, scaleX, scaleY, w: size.w, h: size.h };
            }
            return o;
          }),
        }),
        { recordUndo: true },
      );
    }),

  assignPlayerBall: (objectId) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      const target = frame.objects.find((o) => o.id === objectId);
      if (!target || target.kind !== "offense") return state;

      const turnOff = !!target.hasBall;
      const nextState = updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: f.objects
            .filter((o) => o.kind !== "ball")
            .map((o) => {
              if (o.kind !== "offense") return o;
              if (turnOff) return { ...o, hasBall: false };
              return { ...o, hasBall: o.id === objectId };
            }),
        }),
        { recordUndo: true },
      );
      let play = nextState.play ?? state.play;
      const idx = state.currentFrameIndex;
      if (idx < play.frames.length - 1) {
        play = propagateDirtyFramesForward(play, idx, play.frames.length - 1);
      }
      return {
        ...nextState,
        play,
        frameActionsDirty: true,
      };
    }),

  moveObject: (objectId, x, y) =>
    set((state) =>
      updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: f.objects.map((o) =>
            o.id === objectId
              ? { ...o, x: clamp01(x), y: clamp01(y) }
              : o,
          ),
        }),
        { recordUndo: true },
      ),
    ),

  removeObject: (objectId) =>
    set((state) => ({
      ...updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: f.objects.filter((o) => o.id !== objectId),
        }),
        { recordUndo: true },
      ),
      selectedObjectId:
        state.selectedObjectId === objectId ? null : state.selectedObjectId,
    })),

  beginLineDraft: (x, y) => {
    const { tool, lineActionType, lineThickness } = get();
    const type = tool === "shoot" ? "shoot" : lineActionType;
    set({
      lineDraft: {
        id: "draft",
        type,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        midX: x,
        midY: y,
        strokeWidth: lineThickness,
      },
      freehandDraft: null,
    });
  },

  updateLineDraft: (x, y) =>
    set((state) => {
      if (!state.lineDraft) return state;
      return {
        lineDraft: {
          ...state.lineDraft,
          x2: x,
          y2: y,
          midX: (state.lineDraft.x1 + x) / 2,
          midY: (state.lineDraft.y1 + y) / 2,
        },
      };
    }),

  commitLineDraft: () =>
    set((state) => {
      const draft = state.lineDraft;
      const frame = currentFrame(state);
      if (!draft || !frame) return { lineDraft: null };

      if (
        Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) <
        MIN_ACTION_LENGTH_NORM
      ) {
        return { lineDraft: null };
      }

      const action = buildActionFromEndpoints(
        draft.type,
        draft.x1,
        draft.y1,
        draft.x2,
        draft.y2,
        draft.strokeWidth ?? state.lineThickness,
      );

      return {
        ...updateCurrentFrame(
          state,
          (f) => appendActionToFrame(f, action),
          { recordUndo: true },
        ),
        lineDraft: null,
        selectedActionId: action.id,
        frameActionsDirty: true,
      };
    }),

  cancelLineDraft: () => set({ lineDraft: null }),

  beginFreehandDraft: (x, y) =>
    set({
      freehandDraft: [x, y],
      lineDraft: null,
    }),

  appendFreehandDraftPoint: (x, y) =>
    set((state) => {
      if (!state.freehandDraft) return state;
      const flat = [...state.freehandDraft];
      const lx = flat[flat.length - 2];
      const ly = flat[flat.length - 1];
      if (Math.hypot(x - lx, y - ly) < 0.009) return state;
      flat.push(x, y);
      return { freehandDraft: flat };
    }),

  finishFreehandDraft: () =>
    set((state) => {
      const flat = state.freehandDraft;
      const frame = currentFrame(state);
      if (!flat || flat.length < 4 || !frame) {
        return { freehandDraft: null };
      }

      const prepared = prepareFreehandPath(flat, frame.objects, {
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      });

      const endpointLineTypes: ActionType[] = ["dribble", "handoff", "pass"];
      const useEndpoints =
        !isFreehandStroke(prepared) ||
        endpointLineTypes.includes(state.lineActionType);

      if (useEndpoints) {
        const ends = freehandEndpoints(prepared);
        if (
          Math.hypot(ends.x2 - ends.x1, ends.y2 - ends.y1) <
          MIN_ACTION_LENGTH_NORM
        ) {
          return { freehandDraft: null };
        }
        let { x1, y1, x2, y2 } = ends;
        if (state.lineActionType === "pass") {
          ({ x1, y1, x2, y2 } = snapPassEndpoints(
            x1,
            y1,
            x2,
            y2,
            frame.objects,
            frame.actions,
          ));
        }
        const isCurvedDribble =
          (state.lineActionType === "dribble" || state.lineActionType === "handoff") &&
          isFreehandStroke(prepared);
        const dribbleMid = isCurvedDribble ? dribbleMidFromFlat(prepared) : null;
        const action = buildActionFromEndpoints(
          state.lineActionType,
          x1,
          y1,
          x2,
          y2,
          state.lineThickness,
          dribbleMid
            ? { midX: dribbleMid.midX, midY: dribbleMid.midY }
            : undefined,
        );
        return {
          ...updateCurrentFrame(
            state,
            (f) => appendActionToFrame(f, action),
            { recordUndo: true },
          ),
          freehandDraft: null,
          selectedActionId: action.id,
          frameActionsDirty: true,
        };
      }

      const type = state.lineActionType;
      const ends = freehandEndpoints(prepared);
      if (
        Math.hypot(ends.x2 - ends.x1, ends.y2 - ends.y1) <
        MIN_ACTION_LENGTH_NORM
      ) {
        return { freehandDraft: null };
      }
      let { x1, y1, x2, y2 } = ends;
      if (type === "pass") {
        ({ x1, y1, x2, y2 } = snapPassEndpoints(
          x1,
          y1,
          x2,
          y2,
          frame.objects,
          frame.actions,
        ));
      }
      const mid = curveMidFromFlat(prepared, type);
      const action = buildActionFromEndpoints(
        type,
        x1,
        y1,
        x2,
        y2,
        state.lineThickness,
        {
          midX: mid.midX,
          midY: mid.midY,
          c1x: mid.c1x,
          c1y: mid.c1y,
          c2x: mid.c2x,
          c2y: mid.c2y,
          points: type === "pass" ? undefined : prepared.map(clamp01),
          isFreehand: true,
        },
      );
      return {
        ...updateCurrentFrame(
          state,
          (f) => appendActionToFrame(f, action),
          { recordUndo: true },
        ),
        freehandDraft: null,
        selectedActionId: action.id,
        frameActionsDirty: true,
      };
    }),

  cancelFreehandDraft: () => set({ freehandDraft: null }),

  setAnimRuntime: (state) => set({ animRuntime: state }),

  selectAction: (actionId) =>
    set({ selectedActionId: actionId, selectedObjectId: null }),

  updateAction: (actionId, patch, options) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      const action = frame.actions.find((a) => a.id === actionId);
      const finalPatch =
        action?.type === "pass" && options?.recordUndo
          ? snapPassActionPatch(action, patch, frame)
          : patch;
      return {
        ...updateCurrentFrame(
          state,
          (f) => ({
            ...f,
            actions: f.actions.map((a) =>
              a.id === actionId ? { ...a, ...finalPatch } : a,
            ),
          }),
          options,
        ),
        frameActionsDirty: true,
      };
    }),

  changeActionType: (actionId, newType) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      const action = frame.actions.find((a) => a.id === actionId);
      if (!action || action.type === newType) return state;

      const converted = convertActionType(action, newType);
      let merged: DesignerAction = { ...action, ...converted };

      if (newType === "pass") {
        const snapped = snapPassEndpoints(
          merged.x1,
          merged.y1,
          merged.x2,
          merged.y2,
          frame.objects,
          frame.actions.filter((a) => a.id !== actionId),
        );
        merged = { ...merged, ...snapped };
      }

      let actions = frame.actions.map((a) =>
        a.id === actionId ? merged : a,
      );
      if (newType === "shoot") {
        actions = actions.filter((a) => a.type !== "shoot" || a.id === actionId);
      }

      let nextFrame: DesignerFrame = { ...frame, actions };
      if (
        newType === "dribble" ||
        newType === "pass" ||
        newType === "handoff" ||
        newType === "shoot"
      ) {
        nextFrame = syncBallToActionStart(nextFrame, merged);
      }

      let play = state.play;
      const idx = state.currentFrameIndex;
      const nextState = updateCurrentFrame(state, () => nextFrame, {
        recordUndo: true,
      });
      play = nextState.play ?? state.play;
      if (idx < play.frames.length - 1) {
        play = propagateDirtyFramesForward(play, idx, play.frames.length - 1);
      }

      return {
        ...nextState,
        play,
        lineActionType: newType,
        frameActionsDirty: true,
      };
    }),

  removeAction: (actionId) =>
    set((state) => ({
      ...updateCurrentFrame(
        state,
        (frame) => ({
          ...frame,
          actions: frame.actions.filter((a) => a.id !== actionId),
          actionSequence: (frame.actionSequence ?? frame.actions.map((a) => a.id)).filter(
            (id) => id !== actionId,
          ),
        }),
        { recordUndo: true },
      ),
      frameActionsDirty: true,
      selectedActionId:
        state.selectedActionId === actionId ? null : state.selectedActionId,
    })),

  setActionTiming: (actionId, timing) =>
    set((state) => ({
      ...updateCurrentFrame(state, (frame) => ({
        ...frame,
        actions: frame.actions.map((a) =>
          a.id === actionId ? { ...a, timing } : a,
        ),
      })),
      frameActionsDirty: true,
    })),

  reorderActionSequence: (fromIndex, toIndex) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame || fromIndex === toIndex) return state;
      const seq = [...(frame.actionSequence ?? frame.actions.map((a) => a.id))];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= seq.length || toIndex >= seq.length) {
        return state;
      }
      const [moved] = seq.splice(fromIndex, 1);
      seq.splice(toIndex, 0, moved);
      return {
        ...updateCurrentFrame(state, (f) => ({ ...f, actionSequence: seq })),
        frameActionsDirty: true,
      };
    }),

  applyFormation: (key) =>
    set((state) => {
      const preset = FORMATION_PRESETS[key];
      if (!preset) return state;
      const players = offenseFromSpots(preset.offense);
      return {
        ...updateCurrentFrame(
          state,
          (frame) => replaceOffensePlayers(frame, players),
          { recordUndo: true },
        ),
        frameActionsDirty: true,
      };
    }),

  fastBuildFiveOut: () =>
    set((state) => {
      const players = offenseFromSpots(FIVE_OUT_SPACING);
      return {
        ...updateCurrentFrame(
          state,
          (frame) => replaceOffensePlayers(frame, players),
          { recordUndo: true },
        ),
        frameActionsDirty: true,
      };
    }),

  zoomCourtIn: () =>
    set((state) => ({
      courtZoom: Math.min(150, state.courtZoom + 5),
    })),

  zoomCourtOut: () =>
    set((state) => ({
      courtZoom: Math.max(50, state.courtZoom - 5),
    })),

  resetCourtZoom: () =>
    set((state) => ({
      courtZoom: defaultCourtZoom(state.play.courtType),
    })),

  canUndo: () => (get().undoStack?.length ?? 0) > 0,

  canRedo: () => (get().redoStack?.length ?? 0) > 0,

  undo: () =>
    set((state) => {
      const stack = state.undoStack ?? [];
      if (!stack.length) return state;
      const previous = stack[stack.length - 1];
      const undoStack = stack.slice(0, -1);
      const redoStack = [...(state.redoStack ?? []), clonePlayDocument(state.play)];
      return {
        play: clonePlayDocument(previous),
        undoStack,
        redoStack,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
      };
    }),

  redo: () =>
    set((state) => {
      const stack = state.redoStack ?? [];
      if (!stack.length) return state;
      const next = stack[stack.length - 1];
      const redoStack = stack.slice(0, -1);
      const undoStack = [...(state.undoStack ?? []), clonePlayDocument(state.play)];
      return {
        play: clonePlayDocument(next),
        undoStack,
        redoStack,
        lineDraft: null,
        freehandDraft: null,
        selectedActionId: null,
      };
    }),

  setFrameNotes: (notes) =>
    set((state) =>
      updateCurrentFrame(state, (frame) => ({ ...frame, notes })),
    ),

  mirrorCurrentFrame: () =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      return updateCurrentFrame(
        state,
        (f) => mirrorFrameHorizontal(f, state.play.courtType),
        { recordUndo: true },
      );
    }),

  mirrorEntirePlay: () =>
    set((state) => ({
      ...pushUndoSnapshot(state),
      play: mirrorPlayHorizontal(state.play),
    })),

  replaceCurrentFrame: (frame) =>
    set((state) =>
      updateCurrentFrame(state, () => frame, { recordUndo: true }),
    ),
}));
