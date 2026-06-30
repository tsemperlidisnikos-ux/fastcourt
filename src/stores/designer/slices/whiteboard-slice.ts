import {
  eraseWhiteboardStrokesAt,
  whiteboardStrokesEqual,
} from "@/lib/designer/whiteboard-eraser";
import { clamp01, currentFrame, updateCurrentFrame } from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

export const createWhiteboardSlice: DesignerSliceCreator = (set) => ({
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
      const next = eraseWhiteboardStrokesAt(current, x, y);
      if (whiteboardStrokesEqual(current, next)) return state;
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
});

export const whiteboardInitialState = {
  whiteboardInkColor: "#000000",
  whiteboardInkMode: "draw" as const,
  whiteboardErasing: false,
};
