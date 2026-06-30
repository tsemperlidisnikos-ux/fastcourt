import {
  FORMATION_PRESETS,
  FIVE_OUT_SPACING,
} from "@/lib/designer/formations";
import {
  mirrorFrameHorizontal,
  mirrorPlayHorizontal,
} from "@/lib/designer/mirror-frame";
import {
  currentFrame,
  defaultCourtZoom,
  offenseFromSpots,
  pushUndoSnapshot,
  replaceOffensePlayers,
  updateCurrentFrame,
} from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

export const createFormationZoomMirrorSlice: DesignerSliceCreator = (set) => ({
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
});
