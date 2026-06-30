import { clonePlayDocument } from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

export const createUndoSlice: DesignerSliceCreator = (set, get) => ({
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
});
