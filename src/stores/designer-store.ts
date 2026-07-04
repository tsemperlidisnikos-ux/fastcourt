"use client";

import { create } from "zustand";
import { createBlankPlay } from "@/lib/designer/play-factory";
import { createActionsSlice } from "./designer/slices/actions-slice";
import { createFormationZoomMirrorSlice } from "./designer/slices/formation-zoom-mirror-slice";
import { createFramesSlice } from "./designer/slices/frames-slice";
import { createLineDraftSlice } from "./designer/slices/line-draft-slice";
import {
  createObjectsSlice,
  objectsInitialState,
} from "./designer/slices/objects-slice";
import {
  createPlayDocumentSlice,
  playDocumentInitialState,
} from "./designer/slices/play-document-slice";
import { createUndoSlice } from "./designer/slices/undo-slice";
import {
  createWhiteboardSlice,
  whiteboardInitialState,
} from "./designer/slices/whiteboard-slice";
import type { DesignerState } from "./designer/types";

export type { DesignerState } from "./designer/types";

export const useDesignerStore = create<DesignerState>((set, get) =>
  ({
  play: createBlankPlay(),
  currentFrameIndex: 0,
  tool: "offense",
  lineActionType: "cut",
  ...playDocumentInitialState,
  lineDraft: null,
  freehandDraft: null,
  ...objectsInitialState,
  selectedActionId: null,
  selectedObjectId: null,
  animRuntime: null,
  simulateGuardRotation: false,
  setSimulateGuardRotation: (value: boolean) => set({ simulateGuardRotation: value }),
  frameActionsDirty: false,
  ...whiteboardInitialState,
  undoStack: [],
  redoStack: [],
  courtZoom: 90,
  courtSnapWidthPx: 0,

  ...createPlayDocumentSlice(set, get),
  ...createFramesSlice(set, get),
  ...createUndoSlice(set, get),
  ...createWhiteboardSlice(set, get),
  ...createObjectsSlice(set, get),
  ...createLineDraftSlice(set, get),
  ...createActionsSlice(set, get),
  ...createFormationZoomMirrorSlice(set, get),
  }) as DesignerState,
);
