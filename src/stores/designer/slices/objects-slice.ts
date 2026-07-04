import {
  getShadowDimensions,
  shadowNormSize,
  shadowPlacementFromNormDrag,
} from "@/lib/designer/shadow-geometry";
import {
  getZoneDimensions,
  zoneNormSize,
  zonePlacementFromNormDrag,
} from "@/lib/designer/zone-geometry";
import {
  ballLimit,
  canPlaceBall,
  canPlaceRosterPlayer,
  countBallMarkers,
  nextAvailableJersey,
  rosterModeFromLibraryType,
} from "@/lib/designer/player-limits";
import type { DefenseMarkerStyle } from "@/lib/designer/defense-marker-style";
import type { DesignerObject } from "@/types/designer";
import {
  clamp01,
  currentFrame,
  newObjectId,
  propagateDirtyFramesForward,
  updateCurrentFrame,
} from "../helpers";
import type { DesignerSliceCreator } from "../slice-types";

export const createObjectsSlice: DesignerSliceCreator = (set) => ({
  placeObject: (kind, x, y) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return state;
      const mode = rosterModeFromLibraryType(state.libraryItemType);
      if (kind === "ball") {
        if (!canPlaceBall(frame.objects, mode)) return state;
      } else if (!canPlaceRosterPlayer(frame.objects, kind, mode)) {
        return state;
      }

      let label: string | undefined;
      if (kind === "offense" || kind === "defense") {
        label = nextAvailableJersey(frame.objects, kind, mode) ?? undefined;
        if (!label) return state;
      } else if (kind === "text") {
        label = "Text";
      } else if (kind === "label") {
        label = "Label";
      }

      const object: DesignerObject = {
        id: newObjectId(),
        kind,
        x:
          kind === "offense" || kind === "defense" || kind === "ball"
            ? x
            : clamp01(x),
        y:
          kind === "offense" || kind === "defense" || kind === "ball"
            ? y
            : clamp01(y),
        label,
        ...(kind === "defense"
          ? state.activeDefenseStyle === "guard"
            ? { defenseStyle: "guard" as const, rotation: 0 }
            : { defenseStyle: "mark" as const }
          : {}),
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

  setActiveDefenseStyle: (style: DefenseMarkerStyle) =>
    set({ activeDefenseStyle: style }),

  setObjectDefenseStyle: (objectId, style) =>
    set((state) =>
      updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: f.objects.map((o) => {
            if (o.id !== objectId || o.kind !== "defense") return o;
            if (style === "guard") {
              return {
                ...o,
                defenseStyle: "guard",
                rotation: o.rotation ?? 0,
              };
            }
            return { ...o, defenseStyle: "mark", rotation: undefined };
          }),
        }),
        { recordUndo: true },
      ),
    ),

  setObjectRotation: (
    objectId,
    rotation,
    options?: { recordUndo?: boolean },
  ) =>
    set((state) =>
      updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: f.objects.map((o) =>
            o.id === objectId && o.kind === "defense" && o.defenseStyle === "guard"
              ? { ...o, rotation: ((rotation % 360) + 360) % 360 }
              : o,
          ),
        }),
        { recordUndo: options?.recordUndo ?? false },
      ),
    ),

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
      return {
        ...updateCurrentFrame(
          state,
          (f) => ({
            ...f,
            objects: [...f.objects, object],
          }),
          { recordUndo: true },
        ),
        shadowDraft: null,
      };
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
      return {
        ...updateCurrentFrame(
          state,
          (f) => ({
            ...f,
            objects: [...f.objects, object],
          }),
          { recordUndo: true },
        ),
        zoneDraft: null,
      };
    }),

  cancelZoneDraft: () => set({ zoneDraft: null }),

  selectObject: (objectId) =>
    set({ selectedObjectId: objectId, selectedActionId: null }),

  resizeObjectScales: (
    objectId,
    scaleX,
    scaleY,
    options?: { recordUndo?: boolean },
  ) =>
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
        { recordUndo: options?.recordUndo ?? false },
      );
    }),

  assignPlayerBall: (objectId) =>
    set((state) => {
      const frame = currentFrame(state);
      if (!frame) return state;
      const mode = rosterModeFromLibraryType(state.libraryItemType);
      const target = frame.objects.find((o) => o.id === objectId);
      if (!target || target.kind !== "offense") return state;

      const turnOff = !!target.hasBall;
      if (
        !turnOff &&
        mode === "drill" &&
        !target.hasBall &&
        countBallMarkers(frame.objects, mode) >= ballLimit(mode)
      ) {
        return state;
      }

      const nextState = updateCurrentFrame(
        state,
        (f) => ({
          ...f,
          objects: f.objects
            .filter((o) => (mode === "play" ? o.kind !== "ball" : true))
            .map((o) => {
              if (o.kind !== "offense") return o;
              if (turnOff) {
                return o.id === objectId ? { ...o, hasBall: false } : o;
              }
              if (mode === "play") {
                return { ...o, hasBall: o.id === objectId };
              }
              return o.id === objectId ? { ...o, hasBall: true } : o;
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
            o.id === objectId ? { ...o, x, y } : o,
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
});

export const objectsInitialState = {
  activeShadowType: "rect" as const,
  activeDefenseStyle: "mark" as const,
  shadowDraft: null,
  activeZoneType: "paint" as const,
  zoneDraft: null,
};
