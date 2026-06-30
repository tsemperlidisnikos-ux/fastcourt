import { getActionColor } from "@/lib/designer/action-geometry";
import { mergeCourtViewSettings } from "@/lib/designer/court-view-settings";
import { DEFAULT_LINE_THICKNESS } from "@/lib/designer/action-constants";
import { clampPlaybackSpeed } from "@/lib/designer/animation-timing";
import { createBlankPlay, createPlayFromLibraryItem } from "@/lib/designer/play-factory";
import { useSettingsStore } from "@/stores/settings-store";
import type { CourtViewSettings } from "@/types/designer";
import { defaultCourtZoom, normalizeLoadedPlay } from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

export const createPlayDocumentSlice: DesignerSliceCreator = (set, get) => ({
  setCourtSnapWidthPx: (widthPx) =>
    set((state) =>
      state.courtSnapWidthPx === widthPx
        ? state
        : { courtSnapWidthPx: widthPx },
    ),

  loadPlay: (play, options) => {
    const libraryItemType = options?.libraryItemType ?? get().libraryItemType;
    const normalized = normalizeLoadedPlay(play, libraryItemType);
    const prefsZoom = useSettingsStore.getState().designer.defaultCourtZoom;
    set({
      play: normalized,
      libraryItemType,
      tool: "offense",
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

  setLibraryItemType: (type) => set({ libraryItemType: type }),

  loadFromLibraryItem: (itemId, title) => {
    const play = createPlayFromLibraryItem(itemId, title);
    set({
      play: normalizeLoadedPlay(play, "play"),
      libraryItemType: "play",
      tool: "offense",
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

  setLineActionType: (type) =>
    set({ lineActionType: type, lineColor: getActionColor(type) }),
  setLineColor: (color) => set({ lineColor: color }),
  setLineThickness: (value) =>
    set({ lineThickness: Math.min(8, Math.max(1, Math.round(value))) }),

  setCourtType: (courtType) =>
    set((state) => ({
      play: { ...state.play, courtType },
      lineDraft: null,
      freehandDraft: null,
    })),

  setCourtView: (patch) =>
    set((state) => {
      const prev = mergeCourtViewSettings(state.play.courtView);
      const next: CourtViewSettings = {
        ...prev,
        ...patch,
        featureFilters: patch.featureFilters
          ? { ...prev.featureFilters, ...patch.featureFilters }
          : prev.featureFilters,
      };
      return { play: { ...state.play, courtView: next } };
    }),

  setTitle: (title) => set((state) => ({ play: { ...state.play, title } })),
  setAnimSpeed: (value) =>
    set((state) => ({
      play: {
        ...state.play,
        animSpeed: clampPlaybackSpeed(value),
      },
    })),
  setAnimPauseMs: (value) =>
    set((state) => ({ play: { ...state.play, animPauseMs: value } })),
});

export const playDocumentInitialState = {
  libraryItemType: "play" as const,
  lineThickness: DEFAULT_LINE_THICKNESS,
  lineColor: getActionColor("cut"),
};
