import { convertActionType } from "@/lib/designer/action-convert";
import { objectsAfterFrameActions } from "@/lib/designer/frame-propagation";
import { snapPassEndpoints } from "@/lib/designer/player-edge-snap";
import { rosterModeFromLibraryType } from "@/lib/designer/player-limits";
import type { DesignerAction, DesignerFrame } from "@/types/designer";
import {
  currentFrame,
  designerSnapCourtWidth,
  propagateDirtyFramesForward,
  snapPassActionPatch,
  syncBallToActionStart,
  updateCurrentFrame,
} from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

export const createActionsSlice: DesignerSliceCreator = (set) => ({
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
          ? snapPassActionPatch(
              action,
              patch,
              frame,
              designerSnapCourtWidth(state),
            )
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
          objectsAfterFrameActions(frame, { beforeActionId: actionId }),
          frame.actions.filter((a) => a.id !== actionId),
          designerSnapCourtWidth(state),
        );
        merged = { ...merged, ...snapped };
      }

      let actions = frame.actions.map((a) =>
        a.id === actionId ? merged : a,
      );
      if (newType === "shoot") {
        actions = actions.filter((a) => a.type !== "shoot" || a.id === actionId);
      }

      const rosterMode = rosterModeFromLibraryType(state.libraryItemType);
      let nextFrame: DesignerFrame = { ...frame, actions };
      if (
        newType === "dribble" ||
        newType === "pass" ||
        newType === "handoff" ||
        newType === "shoot"
      ) {
        nextFrame = syncBallToActionStart(nextFrame, merged, rosterMode);
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
});
