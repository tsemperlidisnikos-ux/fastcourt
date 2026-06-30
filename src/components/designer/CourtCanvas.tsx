"use client";

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
} from "react-konva";
import type Konva from "konva";
import { isAnimActionActive } from "@/lib/designer/animation-engine";
import {
  computeCourtViewLayout,
  clampPlacementNorm,
  courtNormToStage,
  placementNormToStage,
  stageToPlacementNorm,
  type CourtCoordSpace,
} from "@/lib/designer/court-view-layout";
import {
  resolveActionStrokeWidth,
  translateDesignerAction,
} from "@/lib/designer/action-geometry";
import {
  curveMidFromFlat,
  dribbleMidFromFlat,
  isFreehandStroke,
} from "@/lib/designer/freehand-geometry";
import {
  resolveLineDrawStart,
  snapDribbleEndpoints,
  snapHandoffEndpoints,
} from "@/lib/designer/player-edge-snap";
import { useCourtImage } from "@/lib/designer/use-court-image";
import {
  mergeCourtViewSettings,
  resolvePlayCourtAppearance,
} from "@/lib/designer/court-view-settings";
import { ActionEditHandles } from "@/components/designer/ActionEditHandles";
import { CourtActionShape } from "@/components/designer/CourtActionShape";
import { useDesignerStore } from "@/stores/designer-store";
import { useSettingsStore } from "@/stores/settings-store";
import { PlayerMarker } from "@/components/designer/PlayerMarker";
import { VectorCourtFloor } from "@/components/designer/VectorCourtFloor";
import { WoodCourtCssUnderlay } from "@/components/designer/WoodCourtCssUnderlay";
import { ShadowEditHandles } from "@/components/designer/ShadowEditHandles";
import { ShadowMarker } from "@/components/designer/ShadowMarker";
import { ZoneMarker } from "@/components/designer/ZoneMarker";
import { shadowPlacementFromNormDrag } from "@/lib/designer/shadow-geometry";
import { zonePlacementFromNormDrag } from "@/lib/designer/zone-geometry";
import { tapMoveThreshold } from "@/lib/viewport/touch-targets";
import type {
  ActionType,
  CourtRect,
  DesignerAction,
  DesignerObject,
  DesignerTool,
  ObjectKind,
} from "@/types/designer";

function clampNorm(x: number, y: number) {
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

function isPlayerKind(kind: ObjectKind) {
  return kind === "offense" || kind === "defense" || kind === "ball";
}

function isPlacementTool(tool: DesignerTool) {
  return (
    tool === "offense" ||
    tool === "defense" ||
    tool === "ball" ||
    tool === "cone" ||
    tool === "text" ||
    tool === "label" ||
    tool === "flag"
  );
}

function playerTokenInteractive(
  tool: DesignerTool,
  objectKind: ObjectKind,
  whiteboardActive: boolean,
  animActive: boolean,
) {
  if (whiteboardActive || animActive) return false;
  if (tool === "select" || tool === "delete") return true;
  if (tool === "offense" && objectKind === "offense") return true;
  return false;
}

function isLineDrawingTool(tool: DesignerTool) {
  return tool === "line" || tool === "shoot";
}

/** Pass uses click-drag with mouse; curved actions use freehand (same as pen). */
function prefersClickDragLine(
  e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  lineActionType: ActionType,
) {
  const evt = e.evt as PointerEvent;
  return evt.pointerType === "mouse" && lineActionType === "pass";
}

const PLACE_GUARD_MS = 80;

function nextPlaceGuardTimestamp(lastAt: number, windowMs = PLACE_GUARD_MS) {
  const now = Date.now();
  if (now - lastAt < windowMs) return null;
  return now;
}

function PlayerToken({
  object,
  court,
  courtType,
  viewLayout,
  courtCoords,
  tool,
  onRemove,
  onAssignBall,
  onMove,
  onSelect,
  removable,
  interactive,
  draggable,
  selected,
}: {
  object: DesignerObject;
  court: CourtRect;
  courtType: "half" | "full";
  viewLayout: ReturnType<typeof computeCourtViewLayout>;
  courtCoords: CourtCoordSpace;
  tool: DesignerTool;
  onRemove: (id: string) => void;
  onAssignBall: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onSelect?: (id: string) => void;
  removable: boolean;
  interactive: boolean;
  draggable: boolean;
  selected?: boolean;
}) {
  const pos = placementNormToStage(
    viewLayout,
    courtType,
    object.x,
    object.y,
    courtCoords,
  );
  const radius = Math.max(12, court.width * 0.028);

  return (
    <PlayerMarker
      object={object}
      x={pos.x}
      y={pos.y}
      radius={radius}
      court={court}
      ballRingMode="editor"
      selected={selected}
      listening={interactive}
      draggable={draggable}
      onDragEnd={(stageX, stageY) => {
        const norm = stageToPlacementNorm(
          viewLayout,
          courtType,
          stageX,
          stageY,
          courtCoords,
        );
        const c = clampPlacementNorm(
          viewLayout,
          courtType,
          norm.x,
          norm.y,
          courtCoords,
        );
        onMove(object.id, c.x, c.y);
      }}
      onPointerUp={() => {
        if (removable) {
          onRemove(object.id);
          return;
        }
        if (tool === "select") {
          onSelect?.(object.id);
          return;
        }
        if (tool === "offense" && object.kind === "offense") {
          onAssignBall(object.id);
        }
      }}
    />
  );
}

function FreehandPreview({
  points,
  court,
  courtType,
  courtCoords = "raster",
}: {
  points: number[];
  court: CourtRect;
  courtType: "half" | "full";
  courtCoords?: CourtCoordSpace;
}) {
  const stagePts: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const p = courtNormToStage(court, courtType, points[i], points[i + 1], courtCoords);
    stagePts.push(p.x, p.y);
  }
  const strokeWidth = resolveActionStrokeWidth(2, court, courtType);
  return (
    <Line
      points={stagePts}
      stroke="#64748b"
      strokeWidth={strokeWidth}
      dash={[6, 4]}
      lineCap="round"
      opacity={0.85}
      listening={false}
    />
  );
}

export type CourtCanvasHandle = {
  exportPng: () => string | null;
  blitToCanvas: (target: HTMLCanvasElement) => boolean;
};

const EXPORT_PIXEL_RATIO = 2;

const CourtCanvas = forwardRef<CourtCanvasHandle>(function CourtCanvas(_props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const drawingRef = useRef(false);
  const tapRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const placeGuardRef = useRef(0);
  const [size, setSize] = useState({ width: 900, height: 520 });

  const play = useDesignerStore((s) => s.play);
  const currentFrameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const tool = useDesignerStore((s) => s.tool);
  const lineActionType = useDesignerStore((s) => s.lineActionType);
  const freehandDraft = useDesignerStore((s) => s.freehandDraft);
  const lineDraft = useDesignerStore((s) => s.lineDraft);
  const lineThickness = useDesignerStore((s) => s.lineThickness);
  const lineColor = useDesignerStore((s) => s.lineColor);
  const selectedActionId = useDesignerStore((s) => s.selectedActionId);
  const selectedObjectId = useDesignerStore((s) => s.selectedObjectId);
  const placeObject = useDesignerStore((s) => s.placeObject);
  const assignPlayerBall = useDesignerStore((s) => s.assignPlayerBall);
  const moveObject = useDesignerStore((s) => s.moveObject);
  const removeObject = useDesignerStore((s) => s.removeObject);
  const removeAction = useDesignerStore((s) => s.removeAction);
  const updateAction = useDesignerStore((s) => s.updateAction);
  const selectAction = useDesignerStore((s) => s.selectAction);
  const selectObject = useDesignerStore((s) => s.selectObject);
  const activeZoneType = useDesignerStore((s) => s.activeZoneType);
  const zoneDraft = useDesignerStore((s) => s.zoneDraft);
  const beginZoneDraft = useDesignerStore((s) => s.beginZoneDraft);
  const updateZoneDraft = useDesignerStore((s) => s.updateZoneDraft);
  const commitZoneDraft = useDesignerStore((s) => s.commitZoneDraft);
  const beginLineDraft = useDesignerStore((s) => s.beginLineDraft);
  const updateLineDraft = useDesignerStore((s) => s.updateLineDraft);
  const commitLineDraft = useDesignerStore((s) => s.commitLineDraft);
  const beginFreehandDraft = useDesignerStore((s) => s.beginFreehandDraft);
  const appendFreehandDraftPoint = useDesignerStore((s) => s.appendFreehandDraftPoint);
  const finishFreehandDraft = useDesignerStore((s) => s.finishFreehandDraft);
  const setCourtSnapWidthPx = useDesignerStore((s) => s.setCourtSnapWidthPx);
  const activeShadowType = useDesignerStore((s) => s.activeShadowType);
  const shadowDraft = useDesignerStore((s) => s.shadowDraft);
  const beginShadowDraft = useDesignerStore((s) => s.beginShadowDraft);
  const updateShadowDraft = useDesignerStore((s) => s.updateShadowDraft);
  const commitShadowDraft = useDesignerStore((s) => s.commitShadowDraft);
  const whiteboardInkColor = useDesignerStore((s) => s.whiteboardInkColor);
  const whiteboardInkMode = useDesignerStore((s) => s.whiteboardInkMode);
  const commitWhiteboardStroke = useDesignerStore((s) => s.commitWhiteboardStroke);
  const eraseWhiteboardAt = useDesignerStore((s) => s.eraseWhiteboardAt);
  const finishWhiteboardErase = useDesignerStore((s) => s.finishWhiteboardErase);
  const { image, failed } = useCourtImage(play.courtType);
  const [whiteboardPreview, setWhiteboardPreview] = useState<number[] | null>(
    null,
  );

  useImperativeHandle(ref, () => ({
    exportPng: () =>
      stageRef.current?.toDataURL({ pixelRatio: EXPORT_PIXEL_RATIO }) ?? null,
    blitToCanvas: (target) => {
      const stage = stageRef.current;
      if (!stage) return false;
      stage.batchDraw();
      const frameCanvas = stage.toCanvas({ pixelRatio: EXPORT_PIXEL_RATIO });
      target.width = frameCanvas.width;
      target.height = frameCanvas.height;
      const ctx = target.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(frameCanvas, 0, 0);
      return true;
    },
  }));

  const animRuntime = useDesignerStore((s) => s.animRuntime);
  const frame = play.frames[currentFrameIndex];
  const displayObjects = animRuntime?.objects ?? frame?.objects ?? [];
  const selectedAction = frame?.actions.find((a) => a.id === selectedActionId);
  const selectedObject = frame?.objects.find((o) => o.id === selectedObjectId);
  const whiteboardActive = tool === "whiteboard";
  const animActive = !!animRuntime?.active;
  const shapeInteractive =
    !whiteboardActive && !animActive && (tool === "select" || tool === "delete");
  const objectDraggable = tool === "select" && !animActive;
  const actionDraggable = objectDraggable;

  function translateAction(
    actionId: string,
    origin: DesignerAction,
    dx: number,
    dy: number,
    recordUndo = false,
  ) {
    updateAction(actionId, translateDesignerAction(origin, dx, dy), {
      recordUndo,
    });
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let active = true;
    const observer = new ResizeObserver((entries) => {
      if (!active) return;
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        const nextW = Math.floor(width);
        const nextH = Math.floor(height);
        setSize((prev) =>
          prev.width === nextW && prev.height === nextH
            ? prev
            : { width: nextW, height: nextH },
        );
      }
    });
    observer.observe(el);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  const courtViewRaw = useDesignerStore((s) => s.play.courtView);
  const courtView = useMemo(
    () => mergeCourtViewSettings(courtViewRaw),
    [courtViewRaw],
  );

  const viewLayout = useMemo(
    () =>
      computeCourtViewLayout(
        size.width,
        size.height,
        play.courtType,
        {
          oob: courtView.sidelinesFt > 0 ? "sideline-both" : "none",
          sidelinesFt: courtView.sidelinesFt,
        },
        courtView.template,
      ),
    [
      courtView.sidelinesFt,
      courtView.template,
      size.width,
      size.height,
      play.courtType,
    ],
  );

  useLayoutEffect(() => {
    setCourtSnapWidthPx(Math.round(viewLayout.court.width));
  }, [viewLayout.court.width, setCourtSnapWidthPx]);

  function pointerNorm(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return stageToPlacementNorm(
      viewLayout,
      play.courtType,
      pointer.x,
      pointer.y,
      courtCoords,
    );
  }

  function pointerId(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const evt = e.evt as PointerEvent;
    return typeof evt.pointerId === "number" ? evt.pointerId : -1;
  }

  function isOnCourt(norm: { x: number; y: number }) {
    return norm.x >= 0 && norm.x <= 1 && norm.y >= 0 && norm.y <= 1;
  }

  const normCourt = useMemo(
    () => ({ x: 0, y: 0, width: 1, height: 1 }) as CourtRect,
    [],
  );

  function resolveDrawStart(x: number, y: number) {
    if (!frame) return { x, y };
    return resolveLineDrawStart(
      x,
      y,
      frame.objects,
      frame.actions,
      lineActionType,
      viewLayout.court.width,
    );
  }

  function clampPlacement(x: number, y: number) {
    return clampPlacementNorm(
      viewLayout,
      play.courtType,
      x,
      y,
      courtCoords,
    );
  }

  function placeCourtObject(kind: ObjectKind, x: number, y: number) {
    const c = isPlayerKind(kind) ? clampPlacement(x, y) : clampNorm(x, y);
    placeObject(kind, c.x, c.y);
  }

  function placeOnce(kind: ObjectKind, x: number, y: number) {
    const now = nextPlaceGuardTimestamp(placeGuardRef.current);
    if (now === null) return;
    placeGuardRef.current = now;
    placeCourtObject(kind, x, y);
  }

  function handleDefensePlacement(
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    e.cancelBubble = true;
    if (isFingerBlocked(e)) return;
    const norm = pointerNorm(e);
    if (!norm) return;
    placeOnce("defense", norm.x, norm.y);
  }

  function isStageBackground(
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    const stage = e.target.getStage();
    return !!stage && e.target === stage;
  }

  const allowFingerDraw = useSettingsStore(
    (s) => s.appearance.allowFingerDraw,
  );
  const highContrastCourt = useSettingsStore(
    (s) => s.appearance.highContrastCourt,
  );
  const appearance = useSettingsStore((s) => s.appearance);
  const courtAppearance = useMemo(
    () => resolvePlayCourtAppearance(courtViewRaw, appearance),
    [courtViewRaw, appearance],
  );
  const courtRenderMode = appearance.courtRenderMode;
  const useRasterCourt =
    courtRenderMode === "image" && image && !failed;
  const woodFloorViaCss =
    !useRasterCourt &&
    courtAppearance.showWoodTiles &&
    !courtView.angle;
  const courtCoords: CourtCoordSpace = useRasterCourt ? "raster" : "vector";

  function isFingerBlocked(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (allowFingerDraw) return false;
    const evt = e.evt as PointerEvent;
    return evt.pointerType === "touch";
  }

  function handleStagePointerDown(
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    if (tool === "select" && !isStageBackground(e)) return;

    const norm = pointerNorm(e);
    if (!norm) return;

    if (
      (tool === "whiteboard" || tool === "line" || tool === "shoot") &&
      isFingerBlocked(e)
    ) {
      return;
    }

    if (tool === "whiteboard" && isOnCourt(norm)) {
      drawingRef.current = true;
      tapRef.current = null;
      if (whiteboardInkMode === "erase") {
        eraseWhiteboardAt(norm.x, norm.y);
        return;
      }
      setWhiteboardPreview([norm.x, norm.y]);
      return;
    }

    if (tool === "line" && isOnCourt(norm)) {
      drawingRef.current = true;
      tapRef.current = null;
      const start = resolveDrawStart(norm.x, norm.y);
      if (prefersClickDragLine(e, lineActionType)) {
        beginLineDraft(start.x, start.y);
      } else {
        beginFreehandDraft(start.x, start.y);
      }
      return;
    }

    if (tool === "shoot" && isOnCourt(norm)) {
      drawingRef.current = true;
      tapRef.current = null;
      const start = resolveDrawStart(norm.x, norm.y);
      beginLineDraft(start.x, start.y);
      return;
    }

    if (tool === "shadow" && isOnCourt(norm)) {
      drawingRef.current = true;
      tapRef.current = null;
      beginShadowDraft(norm.x, norm.y);
      return;
    }

    if (tool === "zone" && isOnCourt(norm)) {
      drawingRef.current = true;
      tapRef.current = null;
      beginZoneDraft(norm.x, norm.y);
      return;
    }

    if (isPlacementTool(tool)) {
      const c =
        tool === "offense" || tool === "defense" || tool === "ball"
          ? clampPlacement(norm.x, norm.y)
          : clampNorm(norm.x, norm.y);
      tapRef.current = {
        pointerId: pointerId(e),
        x: c.x,
        y: c.y,
      };
    }
  }

  function handleStagePointerMove(
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    if (drawingRef.current) {
      if (tool === "whiteboard" && whiteboardInkMode === "erase") {
        const norm = pointerNorm(e);
        if (!norm) return;
        const c = clampNorm(norm.x, norm.y);
        eraseWhiteboardAt(c.x, c.y);
      } else if (tool === "whiteboard" && whiteboardPreview) {
        const norm = pointerNorm(e);
        if (!norm) return;
        const c = clampNorm(norm.x, norm.y);
        const pts = whiteboardPreview;
        const lx = pts[pts.length - 2];
        const ly = pts[pts.length - 1];
        if (Math.hypot(c.x - lx, c.y - ly) > 0.002) {
          setWhiteboardPreview([...pts, c.x, c.y]);
        }
      } else if (tool === "line" && lineDraft) {
        const norm = pointerNorm(e);
        if (!norm) return;
        const c = clampNorm(norm.x, norm.y);
        updateLineDraft(c.x, c.y);
      } else if (tool === "line" && freehandDraft) {
        const norm = pointerNorm(e);
        if (!norm) return;
        const c = clampNorm(norm.x, norm.y);
        appendFreehandDraftPoint(c.x, c.y);
      } else if (tool === "shoot" && lineDraft) {
        const norm = pointerNorm(e);
        if (!norm) return;
        const c = clampNorm(norm.x, norm.y);
        updateLineDraft(c.x, c.y);
      } else if (tool === "shadow" && shadowDraft) {
        const norm = pointerNorm(e);
        if (!norm) return;
        const c = clampNorm(norm.x, norm.y);
        updateShadowDraft(c.x, c.y);
      } else if (tool === "zone" && zoneDraft) {
        const norm = pointerNorm(e);
        if (!norm) return;
        const c = clampNorm(norm.x, norm.y);
        updateZoneDraft(c.x, c.y);
      }
      return;
    }

    if (!tapRef.current) return;
    const norm = pointerNorm(e);
    if (!norm) return;
    const dist = Math.hypot(norm.x - tapRef.current.x, norm.y - tapRef.current.y);
    const moveThreshold = tapMoveThreshold((e.evt as PointerEvent).pointerType);
    if (dist > moveThreshold) {
      tapRef.current = null;
    }
  }

  function handleStagePointerUp(
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    if (
      drawingRef.current &&
      (isLineDrawingTool(tool) ||
        tool === "whiteboard" ||
        tool === "shadow" ||
        tool === "zone")
    ) {
      drawingRef.current = false;
      if (tool === "line") {
        if (lineDraft) commitLineDraft();
        else finishFreehandDraft();
      }
      if (tool === "shoot") commitLineDraft();
      if (tool === "shadow") commitShadowDraft();
      if (tool === "zone") commitZoneDraft();
      if (tool === "whiteboard") {
        if (whiteboardInkMode === "erase") {
          finishWhiteboardErase();
        } else if (whiteboardPreview && whiteboardPreview.length >= 4) {
          commitWhiteboardStroke(whiteboardPreview);
        }
        setWhiteboardPreview(null);
      }
      tapRef.current = null;
      return;
    }

    if (tool === "select" && !isStageBackground(e)) return;
    if (tool === "offense" && !isStageBackground(e)) {
      tapRef.current = null;
      return;
    }

    const norm = pointerNorm(e);

    const pending = tapRef.current;
    tapRef.current = null;
    if (!pending || !isPlacementTool(tool)) {
      if (tool === "select" && e.target === e.target.getStage()) {
        selectAction(null);
        selectObject(null);
      }
      return;
    }

    if (pointerId(e) !== pending.pointerId && pending.pointerId !== -1) return;

    if (!norm) return;

    const dist = Math.hypot(norm.x - pending.x, norm.y - pending.y);
    if (dist > tapMoveThreshold((e.evt as PointerEvent).pointerType)) return;

    placeOnce(tool, norm.x, norm.y);
  }

  const removable = tool === "delete";
  const showActionHandles = tool === "select" && selectedAction;
  const showObjectHandles =
    tool === "select" &&
    selectedObject &&
    (selectedObject.kind === "shadow" || selectedObject.kind === "zone");

  const previewDraft =
    lineDraft && (tool === "shoot" || tool === "line")
      ? {
          ...lineDraft,
          strokeWidth: lineThickness,
          color: lineColor,
        }
      : lineDraft;

  const dribblePreviewDraft =
    tool === "line" &&
    freehandDraft &&
    freehandDraft.length >= 4 &&
    frame &&
    (lineActionType === "dribble" || lineActionType === "handoff")
      ? (() => {
          const rawX1 = freehandDraft[0]!;
          const rawY1 = freehandDraft[1]!;
          const rawX2 = freehandDraft[freehandDraft.length - 2]!;
          const rawY2 = freehandDraft[freehandDraft.length - 1]!;
          const snapped =
            lineActionType === "dribble"
              ? snapDribbleEndpoints(
                  rawX1,
                  rawY1,
                  rawX2,
                  rawY2,
                  frame.objects,
                  frame.actions,
                  viewLayout.court.width,
                )
              : snapHandoffEndpoints(
                  rawX1,
                  rawY1,
                  rawX2,
                  rawY2,
                  frame.objects,
                  frame.actions,
                  viewLayout.court.width,
                );
          const mid = dribbleMidFromFlat(freehandDraft);
          return {
            id: "dribble-draft",
            type: lineActionType,
            x1: snapped.x1,
            y1: snapped.y1,
            x2: snapped.x2,
            y2: snapped.y2,
            midX: mid.midX,
            midY: mid.midY,
            strokeWidth: lineThickness,
            color: lineColor,
          };
        })()
      : null;

  const curvedArrowPreviewDraft =
    tool === "line" &&
    freehandDraft &&
    isFreehandStroke(freehandDraft) &&
    (lineActionType === "cut" ||
      lineActionType === "curl" ||
      lineActionType === "screen")
      ? (() => {
          const mid = curveMidFromFlat(freehandDraft, lineActionType);
          return {
            id: "curve-draft",
            type: lineActionType,
            x1: freehandDraft[0],
            y1: freehandDraft[1],
            x2: freehandDraft[freehandDraft.length - 2],
            y2: freehandDraft[freehandDraft.length - 1],
            midX: mid.midX,
            midY: mid.midY,
            c1x: mid.c1x,
            c1y: mid.c1y,
            c2x: mid.c2x,
            c2y: mid.c2y,
            strokeWidth: lineThickness,
            color: lineColor,
          };
        })()
      : null;

  return (
    <div
      ref={containerRef}
      id="court-container"
      className={`relative h-full w-full${highContrastCourt ? " court-high-contrast" : ""}`}
    >
      {woodFloorViaCss ? (
        <WoodCourtCssUnderlay
          x={viewLayout.total.x}
          y={viewLayout.total.y}
          width={viewLayout.total.width}
          height={viewLayout.total.height}
          woodTextureId={courtAppearance.woodTextureId}
          floorColor={courtAppearance.floorColor}
        />
      ) : null}
      <div
        className={woodFloorViaCss ? "fc-court-stage-overlay" : "h-full w-full"}
        style={woodFloorViaCss ? { position: "absolute", inset: 0 } : undefined}
      >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        style={{ touchAction: "none" }}
      >
        <Layer listening={false}>
          {useRasterCourt
            ? viewLayout.oobRects.map((rect, i) => (
                <Rect
                  key={`oob-${i}`}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
              ))
            : null}
          {useRasterCourt ? (
            <KonvaImage
              image={image}
              x={viewLayout.court.x}
              y={viewLayout.court.y}
              width={viewLayout.court.width}
              height={viewLayout.court.height}
              listening={false}
            />
          ) : (
            <VectorCourtFloor
              court={viewLayout.court}
              floorExtent={viewLayout.total}
              courtType={play.courtType}
              template={courtView.template}
              floorColor={courtAppearance.floorColor}
              lineColor={courtAppearance.lineColor}
              showWoodTiles={courtAppearance.showWoodTiles}
              woodFloorViaCss={woodFloorViaCss}
              woodTextureId={courtAppearance.woodTextureId}
              featureFilters={courtView.featureFilters}
              showBaskets={courtView.showBaskets}
              angle={courtView.angle}
              sidelinesFt={courtView.sidelinesFt}
            />
          )}
        </Layer>
        <Layer>
          {(frame?.actions ?? []).map((action) => {
            if (animActive) {
              const revealed = animRuntime!.revealedActionIds.includes(action.id);
              const active = isAnimActionActive(animRuntime!, action.id);
              if (!revealed && !active) return null;
              if (active && animRuntime!.showActiveLine === false) return null;
              return (
                <CourtActionShape
                  key={action.id}
                  action={action}
                  court={viewLayout.court}
                  courtType={play.courtType}
                  courtCoords={courtCoords}
                  selected={active}
                  revealProgress={active ? animRuntime!.lineProgress : 1}
                  interactive={false}
                />
              );
            }
            return (
              <CourtActionShape
                key={action.id}
                action={action}
                court={viewLayout.court}
                courtType={play.courtType}
                courtCoords={courtCoords}
                selected={selectedActionId === action.id}
                interactive={shapeInteractive}
                draggable={actionDraggable}
                onSelect={tool === "select" ? selectAction : undefined}
                onTranslate={actionDraggable ? translateAction : undefined}
                onRemove={removeAction}
                removable={removable}
              />
            );
          })}
          {previewDraft ? (
            <CourtActionShape
              action={previewDraft}
              court={viewLayout.court}
              courtType={play.courtType}
              courtCoords={courtCoords}
              preview
              interactive={false}
            />
          ) : null}
          {dribblePreviewDraft ? (
            <CourtActionShape
              action={dribblePreviewDraft}
              court={viewLayout.court}
              courtType={play.courtType}
              courtCoords={courtCoords}
              preview
              interactive={false}
            />
          ) : curvedArrowPreviewDraft ? (
            <CourtActionShape
              action={curvedArrowPreviewDraft}
              court={viewLayout.court}
              courtType={play.courtType}
              courtCoords={courtCoords}
              preview
              interactive={false}
            />
          ) : freehandDraft && freehandDraft.length >= 4 ? (
            <FreehandPreview
              points={freehandDraft}
              court={viewLayout.court}
              courtType={play.courtType}
              courtCoords={courtCoords}
            />
          ) : null}
          {zoneDraft && tool === "zone" ? (
            (() => {
              const placement = zonePlacementFromNormDrag(
                activeZoneType,
                normCourt,
                zoneDraft.x1,
                zoneDraft.y1,
                zoneDraft.x2,
                zoneDraft.y2,
              );
              const pos = courtNormToStage(
                viewLayout.court,
                play.courtType,
                placement.x,
                placement.y,
                courtCoords,
              );
              return (
                <Group x={pos.x} y={pos.y} listening={false} opacity={0.72}>
                  <ZoneMarker
                    type={activeZoneType}
                    court={viewLayout.court}
                    scaleX={placement.scaleX}
                    scaleY={placement.scaleY}
                  />
                </Group>
              );
            })()
          ) : null}
          {shadowDraft && tool === "shadow" ? (
            (() => {
              const placement = shadowPlacementFromNormDrag(
                activeShadowType,
                normCourt,
                shadowDraft.x1,
                shadowDraft.y1,
                shadowDraft.x2,
                shadowDraft.y2,
              );
              const pos = courtNormToStage(
                viewLayout.court,
                play.courtType,
                placement.x,
                placement.y,
                courtCoords,
              );
              return (
                <Group x={pos.x} y={pos.y} listening={false} opacity={0.72}>
                  <ShadowMarker
                    type={activeShadowType}
                    court={viewLayout.court}
                    scaleX={placement.scaleX}
                    scaleY={placement.scaleY}
                  />
                </Group>
              );
            })()
          ) : null}
        </Layer>
        <Layer>
          {displayObjects.map((object) => (
            <PlayerToken
              key={object.id}
              object={object}
              court={viewLayout.court}
              courtType={play.courtType}
              viewLayout={viewLayout}
              courtCoords={courtCoords}
              tool={tool}
              onRemove={removeObject}
              onAssignBall={assignPlayerBall}
              onMove={moveObject}
              onSelect={tool === "select" ? selectObject : undefined}
              removable={removable}
              interactive={playerTokenInteractive(
                tool,
                object.kind,
                whiteboardActive,
                animActive,
              )}
              draggable={objectDraggable}
              selected={selectedObjectId === object.id}
            />
          ))}
        </Layer>
        <Layer listening={false}>
          {(frame?.whiteboardStrokes ?? []).map((stroke, i) => {
            const stagePts: number[] = [];
            for (let j = 0; j < stroke.points.length; j += 2) {
              const p = courtNormToStage(
                viewLayout.court,
                play.courtType,
                stroke.points[j],
                stroke.points[j + 1],
                courtCoords,
              );
              stagePts.push(p.x, p.y);
            }
            return (
              <Line
                key={`wb-${i}`}
                points={stagePts}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                lineCap="round"
                lineJoin="round"
                tension={0.3}
                listening={false}
              />
            );
          })}
          {whiteboardPreview && whiteboardPreview.length >= 2 ? (
            <Line
              points={(() => {
                const stagePts: number[] = [];
                for (let j = 0; j < whiteboardPreview.length; j += 2) {
                  const p = courtNormToStage(
                    viewLayout.court,
                    play.courtType,
                    whiteboardPreview[j],
                    whiteboardPreview[j + 1],
                    courtCoords,
                  );
                  stagePts.push(p.x, p.y);
                }
                return stagePts;
              })()}
              stroke={whiteboardInkColor}
              strokeWidth={3}
              lineCap="round"
              lineJoin="round"
              tension={0.3}
              listening={false}
            />
          ) : null}
        </Layer>
        {showActionHandles ? (
          <Layer>
            <ActionEditHandles
              action={selectedAction}
              court={viewLayout.court}
              courtType={play.courtType}
              courtCoords={courtCoords}
            />
          </Layer>
        ) : null}
        {showObjectHandles && selectedObject ? (
          <Layer>
            <ShadowEditHandles
              object={selectedObject}
              court={viewLayout.court}
              courtType={play.courtType}
            />
          </Layer>
        ) : null}
        {tool === "defense" && !whiteboardActive && !animActive ? (
          <Layer>
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill="#ffffff"
              opacity={0.01}
              listening
              onTap={handleDefensePlacement}
            />
          </Layer>
        ) : null}
      </Stage>
      </div>
    </div>
  );
});

export default CourtCanvas;
