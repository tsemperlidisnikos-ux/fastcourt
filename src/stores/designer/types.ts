import type { FormationKey } from "@/lib/designer/formations";
import type { DefenseMarkerStyle } from "@/lib/designer/defense-marker-style";
import type { ShadowType } from "@/lib/designer/shadow-geometry";
import type { ZoneType } from "@/lib/designer/zone-geometry";
import type {
  ActionTiming,
  ActionType,
  CourtType,
  CourtViewSettings,
  DesignerAction,
  DesignerFrame,
  DesignerObject,
  DesignerTool,
  ObjectKind,
  PlayDocument,
} from "@/types/designer";
import type { LibraryItemType } from "@/types/library";

export interface DesignerState {
  play: PlayDocument;
  currentFrameIndex: number;
  undoStack: PlayDocument[];
  redoStack: PlayDocument[];
  courtZoom: number;
  /** Live court width in px from CourtCanvas — used for line/player edge snap. */
  courtSnapWidthPx: number;
  setCourtSnapWidthPx: (widthPx: number) => void;
  tool: DesignerTool;
  lineActionType: ActionType;
  lineThickness: number;
  lineColor: string;
  lineDraft: DesignerAction | null;
  freehandDraft: number[] | null;
  activeShadowType: ShadowType;
  activeDefenseStyle: DefenseMarkerStyle;
  shadowDraft: { x1: number; y1: number; x2: number; y2: number } | null;
  activeZoneType: ZoneType;
  zoneDraft: { x1: number; y1: number; x2: number; y2: number } | null;
  selectedActionId: string | null;
  selectedObjectId: string | null;
  animRuntime: {
    active: boolean;
    objects: DesignerObject[];
    activeActionId: string | null;
    activeActionIds?: string[];
    revealedActionIds: string[];
    lineProgress: number;
    showActiveLine?: boolean;
  } | null;
  /** Preview-only: rotate guard defenders toward ball during animation. */
  simulateGuardRotation: boolean;
  setSimulateGuardRotation: (value: boolean) => void;
  frameActionsDirty: boolean;
  libraryItemType: LibraryItemType;
  loadPlay: (
    play: PlayDocument,
    options?: { libraryItemType?: LibraryItemType },
  ) => void;
  setLibraryItemType: (type: LibraryItemType) => void;
  loadFromLibraryItem: (itemId: string, title: string) => void;
  setTool: (tool: DesignerTool) => void;
  setLineActionType: (type: ActionType) => void;
  setLineColor: (color: string) => void;
  setLineThickness: (value: number) => void;
  setCourtType: (courtType: CourtType) => void;
  setCourtView: (patch: Partial<CourtViewSettings>) => void;
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
  setActiveDefenseStyle: (style: DefenseMarkerStyle) => void;
  setObjectDefenseStyle: (objectId: string, style: DefenseMarkerStyle) => void;
  setObjectRotation: (
    objectId: string,
    rotation: number,
    options?: { recordUndo?: boolean },
  ) => void;
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
  resizeObjectScales: (
    objectId: string,
    scaleX: number,
    scaleY: number,
    options?: { recordUndo?: boolean },
  ) => void;
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
  setAnimRuntime: (state: DesignerState["animRuntime"]) => void;
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
  setFrameShowTitleInAnimation: (show: boolean) => void;
  setFrameAnimDurationSec: (seconds: number) => void;
  mirrorCurrentFrame: () => void;
  mirrorEntirePlay: () => void;
  replaceCurrentFrame: (frame: DesignerFrame) => void;
}
