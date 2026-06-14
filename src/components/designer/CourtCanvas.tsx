"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Arc,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
} from "react-konva";
import type Konva from "konva";
import { HALF_COURT_BASKET_NY } from "@/lib/designer/constants";
import {
  computeCourtViewLayout,
  courtNormToStage,
  stageToCourtNorm,
} from "@/lib/designer/court-view-layout";
import {
  resolveActionStrokeWidth,
  translateDesignerAction,
} from "@/lib/designer/action-geometry";
import { dribbleMidFromFlat } from "@/lib/designer/freehand-geometry";
import { findClosestActionLineEndpoint } from "@/lib/designer/line-chain-snap";
import { closestPlayer, PLAYER_SNAP_NORM } from "@/lib/designer/player-snap";
import { useCourtImage } from "@/lib/designer/use-court-image";
import { ActionEditHandles } from "@/components/designer/ActionEditHandles";
import { CourtActionShape } from "@/components/designer/CourtActionShape";
import { useDesignerStore } from "@/stores/designer-store";
import { useSettingsStore } from "@/stores/settings-store";
import { PlayerMarker } from "@/components/designer/PlayerMarker";
import { ShadowEditHandles } from "@/components/designer/ShadowEditHandles";
import { ShadowMarker } from "@/components/designer/ShadowMarker";
import { ZoneMarker } from "@/components/designer/ZoneMarker";
import { shadowPlacementFromNormDrag } from "@/lib/designer/shadow-geometry";
import { zonePlacementFromNormDrag } from "@/lib/designer/zone-geometry";
import type {
  CourtRect,
  DesignerAction,
  DesignerObject,
  DesignerTool,
  ObjectKind,
} from "@/types/designer";

const TAP_MOVE_NORM = 0.025;

function clampNorm(x: number, y: number) {
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
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

function isLineDrawingTool(tool: DesignerTool) {
  return tool === "line" || tool === "shoot";
}

function FallbackCourtFloor({
  court,
  courtType,
}: {
  court: CourtRect;
  courtType: "half" | "full";
}) {
  const midX = court.x + court.width / 2;
  const hoopY = court.y + court.height * HALF_COURT_BASKET_NY;
  const arcRadius = Math.min(court.width, court.height) * 0.12;

  return (
    <Group listening={false}>
      <Rect
        x={court.x}
        y={court.y}
        width={court.width}
        height={court.height}
        fill="#fffaf5"
        stroke="#1e293b"
        strokeWidth={2.5}
      />
      <Line
        points={[midX, court.y, midX, court.y + court.height]}
        stroke="#94a3b8"
        strokeWidth={1.5}
        dash={courtType === "full" ? undefined : [8, 6]}
      />
      <Arc
        x={midX}
        y={hoopY}
        innerRadius={0}
        outerRadius={arcRadius}
        angle={180}
        rotation={0}
        stroke="#64748b"
        strokeWidth={2}
      />
    </Group>
  );
}

function PlayerToken({
  object,
  court,
  courtType,
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
  const pos = courtNormToStage(court, courtType, object.x, object.y);
  const radius = Math.max(12, court.width * 0.028);

  return (
    <PlayerMarker
      object={object}
      x={pos.x}
      y={pos.y}
      radius={radius}
      court={court}
      selected={selected}
      listening={interactive}
      draggable={draggable}
      onDragEnd={(stageX, stageY) => {
        const norm = stageToCourtNorm(court, courtType, stageX, stageY);
        const c = clampNorm(norm.x, norm.y);
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
}: {
  points: number[];
  court: CourtRect;
  courtType: "half" | "full";
}) {
  const stagePts: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const p = courtNormToStage(court, courtType, points[i], points[i + 1]);
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
};

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
    exportPng: () => stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? null,
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
  const playerInteractive =
    !whiteboardActive &&
    !animActive &&
    (tool === "select" || tool === "delete" || tool === "offense");
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
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const viewLayout = useMemo(
    () =>
      computeCourtViewLayout(size.width, size.height, play.courtType, {
        oob: "none",
      }),
    [size.width, size.height, play.courtType],
  );

  function pointerNorm(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return stageToCourtNorm(
      viewLayout.court,
      play.courtType,
      pointer.x,
      pointer.y,
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
    const chain =
      lineActionType === "pass"
        ? findClosestActionLineEndpoint(x, y, frame.actions, { types: ["dribble"] })
        : findClosestActionLineEndpoint(x, y, frame.actions, {
            types: ["dribble", "cut", "curl"],
          });
    if (chain) return { x: chain.x, y: chain.y };
    return { x, y };
  }

  function placeOnce(kind: ObjectKind, x: number, y: number) {
    const now = Date.now();
    if (now - placeGuardRef.current < 80) return;
    placeGuardRef.current = now;
    placeObject(kind, x, y);
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
      beginFreehandDraft(start.x, start.y);
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

    if (isPlacementTool(tool) && isOnCourt(norm)) {
      tapRef.current = {
        pointerId: pointerId(e),
        x: norm.x,
        y: norm.y,
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
    if (dist > TAP_MOVE_NORM) {
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
      if (tool === "line") finishFreehandDraft();
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

    const norm = pointerNorm(e);
    if (norm && frame && tool === "offense") {
      const offenseOnly = frame.objects.filter((o) => o.kind === "offense");
      const tapped = closestPlayer(
        norm.x,
        norm.y,
        offenseOnly,
        [],
        PLAYER_SNAP_NORM * 1.5,
      );
      if (tapped) {
        assignPlayerBall(tapped.id);
        tapRef.current = null;
        return;
      }
    }

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

    if (!norm || !isOnCourt(norm)) return;

    const dist = Math.hypot(norm.x - pending.x, norm.y - pending.y);
    if (dist > TAP_MOVE_NORM) return;

    if (tool === "offense" || tool === "defense") {
      const sameKind = frame?.objects.filter((o) => o.kind === tool) ?? [];
      const existing = closestPlayer(
        norm.x,
        norm.y,
        sameKind,
        [],
        PLAYER_SNAP_NORM * 1.2,
      );
      if (existing?.kind === "offense" && tool === "offense") {
        assignPlayerBall(existing.id);
        return;
      }
    }

    placeOnce(tool, norm.x, norm.y);
  }

  const removable = tool === "delete";
  const showActionHandles = tool === "select" && selectedAction;
  const showObjectHandles =
    tool === "select" &&
    selectedObject &&
    (selectedObject.kind === "shadow" || selectedObject.kind === "zone");

  const previewDraft =
    lineDraft && tool === "shoot"
      ? {
          ...lineDraft,
          strokeWidth: lineThickness,
        }
      : lineDraft;

  const dribblePreviewDraft =
    tool === "line" &&
    freehandDraft &&
    freehandDraft.length >= 4 &&
    (lineActionType === "dribble" || lineActionType === "handoff")
      ? (() => {
          const mid = dribbleMidFromFlat(freehandDraft);
          return {
            id: "dribble-draft",
            type: lineActionType,
            x1: freehandDraft[0],
            y1: freehandDraft[1],
            x2: freehandDraft[freehandDraft.length - 2],
            y2: freehandDraft[freehandDraft.length - 1],
            midX: mid.midX,
            midY: mid.midY,
            strokeWidth: lineThickness,
          };
        })()
      : null;

  return (
    <div
      ref={containerRef}
      id="court-container"
      className={`h-full w-full${highContrastCourt ? " court-high-contrast" : ""}`}
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
          {viewLayout.oobRects.map((rect, i) => (
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
          ))}
          {image && !failed ? (
            <KonvaImage
              image={image}
              x={viewLayout.court.x}
              y={viewLayout.court.y}
              width={viewLayout.court.width}
              height={viewLayout.court.height}
            />
          ) : (
            <FallbackCourtFloor
              court={viewLayout.court}
              courtType={play.courtType}
            />
          )}
        </Layer>
        <Layer>
          {(frame?.actions ?? []).map((action) => {
            if (animActive) {
              const revealed = animRuntime!.revealedActionIds.includes(action.id);
              const active = animRuntime!.activeActionId === action.id;
              if (!revealed && !active) return null;
              return (
                <CourtActionShape
                  key={action.id}
                  action={action}
                  court={viewLayout.court}
                  courtType={play.courtType}
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
              preview
              interactive={false}
            />
          ) : null}
          {dribblePreviewDraft ? (
            <CourtActionShape
              action={dribblePreviewDraft}
              court={viewLayout.court}
              courtType={play.courtType}
              preview
              interactive={false}
            />
          ) : freehandDraft && freehandDraft.length >= 4 ? (
            <FreehandPreview
              points={freehandDraft}
              court={viewLayout.court}
              courtType={play.courtType}
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
          {displayObjects
            .filter((object) => object.kind !== "ball")
            .map((object) => (
            <PlayerToken
              key={object.id}
              object={object}
              court={viewLayout.court}
              courtType={play.courtType}
              tool={tool}
              onRemove={removeObject}
              onAssignBall={assignPlayerBall}
              onMove={moveObject}
              onSelect={tool === "select" ? selectObject : undefined}
              removable={removable}
              interactive={playerInteractive}
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
      </Stage>
    </div>
  );
});

export default CourtCanvas;
