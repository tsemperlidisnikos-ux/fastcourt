import { defaultReadBranchForCoverage } from "@/lib/designer/frame-read-branch";
import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
import { createFrame } from "@/lib/designer/play-factory";
import {
  MAX_FRAME_ANIM_DURATION_SEC,
  MIN_FRAME_ANIM_DURATION_SEC,
} from "@/lib/designer/animation-timing";
import {
  applyFixesToFrame,
  type DesignerCoachFix,
} from "@/lib/designer/designer-coach-apply";
import { rosterModeFromLibraryType } from "@/lib/designer/player-limits";
import type { DesignerFrame, FrameReadBranch } from "@/types/designer";
import {
  cloneAction,
  newObjectId,
  propagateDirtyFramesForward,
  pushUndoSnapshot,
  updateCurrentFrame,
} from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

export const createFramesSlice: DesignerSliceCreator = (set, get) => ({
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

  setFrameNotes: (notes) =>
    set((state) =>
      updateCurrentFrame(state, (frame) => ({ ...frame, notes })),
    ),

  setFrameShowTitleInAnimation: (show) =>
    set((state) =>
      updateCurrentFrame(state, (frame) => ({
        ...frame,
        showTitleInAnimation: show,
      })),
    ),

  setFrameAnimDurationSec: (seconds) =>
    set((state) =>
      updateCurrentFrame(state, (frame) => ({
        ...frame,
        animDurationSec: Math.min(
          MAX_FRAME_ANIM_DURATION_SEC,
          Math.max(MIN_FRAME_ANIM_DURATION_SEC, seconds),
        ),
      })),
    ),

  applyCoachFixes: (fixes) =>
    set((state) =>
      !fixes.length
        ? state
        : updateCurrentFrame(
            state,
            (frame) =>
              applyFixesToFrame(frame, fixes, {
                rosterMode: rosterModeFromLibraryType(state.libraryItemType),
              }),
            { recordUndo: true },
          ),
    ),

  replaceCurrentFrame: (frame) =>
    set((state) =>
      updateCurrentFrame(state, () => frame, { recordUndo: true }),
    ),

  setFrameReadBranch: (branch) =>
    set((state) =>
      updateCurrentFrame(state, (frame) => ({
        ...frame,
        readBranch: branch,
      }), { recordUndo: true }),
    ),

  addReadFrame: (coverage, label) =>
    set((state) => {
      const source = state.play.frames[state.currentFrameIndex];
      if (!source) return state;
      const nextIndex = state.play.frames.length + 1;
      const branch = defaultReadBranchForCoverage(
        coverage,
        source.id,
        label || `If ${coverage.toUpperCase()}`,
      );
      const draft: DesignerFrame = {
        ...createFrame(branch.label, nextIndex),
        objects: source.objects.map((o) => ({ ...o, id: newObjectId() })),
        readBranch: branch,
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

  appendImportedReadFrame: (importedFrame, coverage, label) =>
    set((state) => {
      const parent = state.play.frames[state.currentFrameIndex];
      if (!parent) return state;
      const branch = defaultReadBranchForCoverage(
        coverage,
        parent.id,
        label || `If ${coverage.toUpperCase()}`,
      );
      const frame: DesignerFrame = {
        ...importedFrame,
        name: branch.label,
        readBranch: branch,
      };
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
});
