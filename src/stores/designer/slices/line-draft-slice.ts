import { MIN_ACTION_LENGTH_NORM } from "@/lib/designer/action-constants";
import { getActionColor } from "@/lib/designer/action-geometry";
import {
  adjustFreehandEndpoints,
  curveMidFromFlat,
  dribbleMidFromFlat,
  freehandEndpoints,
  isFreehandStroke,
  prepareFreehandPath,
} from "@/lib/designer/freehand-geometry";
import {
  snapCutEndpoints,
  snapDribbleEndpoints,
  snapHandoffEndpoints,
  snapPassEndpoints,
  snapScreenEndpoints,
} from "@/lib/designer/player-edge-snap";
import { rosterModeFromLibraryType } from "@/lib/designer/player-limits";
import type { ActionType, DesignerAction } from "@/types/designer";
import {
  appendActionToFrame,
  buildActionFromEndpoints,
  clamp01,
  currentFrame,
  designerSnapCourtWidth,
  passSourcePlayerExtra,
  snapContextObjects,
  updateCurrentFrame,
  withDrawColor,
} from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

function snapLineEndpoints(
  type: ActionType,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  snapObjects: ReturnType<typeof snapContextObjects>,
  actions: DesignerAction[],
  snapCourtW: number,
) {
  if (type === "cut" || type === "curl") {
    return snapCutEndpoints(x1, y1, x2, y2, snapObjects, actions, snapCourtW);
  }
  if (type === "pass") {
    return snapPassEndpoints(x1, y1, x2, y2, snapObjects, actions, snapCourtW);
  }
  if (type === "screen") {
    return snapScreenEndpoints(x1, y1, x2, y2, snapObjects, actions, snapCourtW);
  }
  if (type === "dribble") {
    return snapDribbleEndpoints(x1, y1, x2, y2, snapObjects, actions, snapCourtW);
  }
  if (type === "handoff") {
    return snapHandoffEndpoints(x1, y1, x2, y2, snapObjects, actions, snapCourtW);
  }
  return { x1, y1, x2, y2 };
}

export const createLineDraftSlice: DesignerSliceCreator = (set, get) => ({
  beginLineDraft: (x, y) => {
    const { tool, lineActionType, lineThickness } = get();
    const type = tool === "shoot" ? "shoot" : lineActionType;
    const color = getActionColor(type);
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
        color,
      },
      freehandDraft: null,
      lineColor: color,
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

      let { x1, y1, x2, y2 } = draft;
      const snapObjects = snapContextObjects(frame);
      const snapCourtW = designerSnapCourtWidth(state);
      ({ x1, y1, x2, y2 } = snapLineEndpoints(
        draft.type,
        x1,
        y1,
        x2,
        y2,
        snapObjects,
        frame.actions,
        snapCourtW,
      ));

      const action = buildActionFromEndpoints(
        draft.type,
        x1,
        y1,
        x2,
        y2,
        draft.strokeWidth ?? state.lineThickness,
        {
          color: draft.color ?? state.lineColor,
          ...passSourcePlayerExtra(draft.type, draft.x1, draft.y1, snapObjects),
        },
      );

      const rosterMode = rosterModeFromLibraryType(state.libraryItemType);
      return {
        ...updateCurrentFrame(
          state,
          (f) => appendActionToFrame(f, action, rosterMode),
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

      const snapObjects = snapContextObjects(frame);

      const endpointLineTypes: ActionType[] = [
        "cut",
        "curl",
        "dribble",
        "handoff",
        "pass",
      ];
      const isCurvedArrowStroke =
        isFreehandStroke(prepared) &&
        (state.lineActionType === "cut" ||
          state.lineActionType === "curl" ||
          state.lineActionType === "screen");
      const useEndpoints =
        !isCurvedArrowStroke &&
        (!isFreehandStroke(prepared) ||
          endpointLineTypes.includes(state.lineActionType));

      if (useEndpoints) {
        const ends = freehandEndpoints(prepared);
        if (
          Math.hypot(ends.x2 - ends.x1, ends.y2 - ends.y1) <
          MIN_ACTION_LENGTH_NORM
        ) {
          return { freehandDraft: null };
        }
        let { x1, y1, x2, y2 } = ends;
        const snapCourtW = designerSnapCourtWidth(state);
        ({ x1, y1, x2, y2 } = snapLineEndpoints(
          state.lineActionType,
          x1,
          y1,
          x2,
          y2,
          snapObjects,
          frame.actions,
          snapCourtW,
        ));
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
          withDrawColor(state, {
            ...(dribbleMid
              ? { midX: dribbleMid.midX, midY: dribbleMid.midY }
              : {}),
            ...passSourcePlayerExtra(
              state.lineActionType,
              ends.x1,
              ends.y1,
              snapObjects,
            ),
          }),
        );
        const rosterMode = rosterModeFromLibraryType(state.libraryItemType);
        return {
          ...updateCurrentFrame(
            state,
            (f) => appendActionToFrame(f, action, rosterMode),
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
      const snapCourtW = designerSnapCourtWidth(state);
      ({ x1, y1, x2, y2 } = snapLineEndpoints(
        type,
        x1,
        y1,
        x2,
        y2,
        snapObjects,
        frame.actions,
        snapCourtW,
      ));
      const snappedPath = adjustFreehandEndpoints(prepared, x1, y1, x2, y2);
      const mid = curveMidFromFlat(snappedPath, type);
      const action = buildActionFromEndpoints(
        type,
        x1,
        y1,
        x2,
        y2,
        state.lineThickness,
        withDrawColor(state, {
          midX: mid.midX,
          midY: mid.midY,
          c1x: mid.c1x,
          c1y: mid.c1y,
          c2x: mid.c2x,
          c2y: mid.c2y,
          points: type === "pass" ? undefined : snappedPath.map(clamp01),
          isFreehand: true,
          ...passSourcePlayerExtra(type, ends.x1, ends.y1, snapObjects),
        }),
      );
      const rosterMode = rosterModeFromLibraryType(state.libraryItemType);
      return {
        ...updateCurrentFrame(
          state,
          (f) => appendActionToFrame(f, action, rosterMode),
          { recordUndo: true },
        ),
        freehandDraft: null,
        selectedActionId: action.id,
        frameActionsDirty: true,
      };
    }),

  cancelFreehandDraft: () => set({ freehandDraft: null }),
});
