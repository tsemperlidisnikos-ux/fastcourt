"use client";

import { eraseStrokesAt } from "@/lib/designer/stroke-partial-eraser";
import { visibleStrokesAt } from "@/lib/film-room/annotation-visibility";
import type { FilmRoomInkTool, VideoAnnotationStroke } from "@/types/film-room";
import { useCallback, useEffect, useRef } from "react";

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: VideoAnnotationStroke,
  width: number,
  height: number,
) {
  if (stroke.points.length < 4) return;
  ctx.beginPath();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.moveTo(stroke.points[0] * width, stroke.points[1] * height);
  for (let i = 2; i < stroke.points.length; i += 2) {
    ctx.lineTo(stroke.points[i] * width, stroke.points[i + 1] * height);
  }
  ctx.stroke();
}

function toNorm(
  x: number,
  y: number,
  width: number,
  height: number,
): [number, number] {
  return [x / width, y / height];
}

interface Props {
  width: number;
  height: number;
  strokes: VideoAnnotationStroke[];
  currentTime: number;
  tool: FilmRoomInkTool;
  inkColor: string;
  inkWidth: number;
  onStrokesChange: (strokes: VideoAnnotationStroke[]) => void;
  onStrokeComplete: (stroke: VideoAnnotationStroke) => void;
  onStrokeStart?: () => void;
  onEraserGestureStart?: () => void;
}

export function VideoAnnotationCanvas({
  width,
  height,
  strokes,
  currentTime,
  tool,
  inkColor,
  inkWidth,
  onStrokesChange,
  onStrokeComplete,
  onStrokeStart,
  onEraserGestureStart,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const draftRef = useRef<number[]>([]);
  const anchorTimeRef = useRef(0);
  const strokesRef = useRef(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
    if (!drawingRef.current) {
      draftRef.current = [];
    }
  }, [strokes]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const stroke of visibleStrokesAt(strokesRef.current, currentTime)) {
      drawStroke(ctx, stroke, width, height);
    }
    if (draftRef.current.length >= 4) {
      drawStroke(
        ctx,
        {
          id: "draft",
          time: anchorTimeRef.current,
          points: draftRef.current,
          color: inkColor,
          width: inkWidth,
          kind: tool === "laser" ? "laser" : "pen",
        },
        width,
        height,
      );
    }
  }, [currentTime, height, inkColor, inkWidth, tool, width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = width;
    canvas.height = height;
    redraw();
  }, [width, height, redraw]);

  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  const getPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const drawingEnabled = tool === "pen" || tool === "laser" || tool === "eraser";

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    if (!point) return;

    onStrokeStart?.();
    drawingRef.current = true;
    anchorTimeRef.current = currentTime;

    if (tool === "eraser") {
      onEraserGestureStart?.();
      const pixelStrokes = strokesRef.current.map((stroke) => ({
        ...stroke,
        points: stroke.points.flatMap((v, i) =>
          i % 2 === 0 ? [v * width] : [v * height],
        ),
      }));
      const erased = eraseStrokesAt(pixelStrokes, point.x, point.y, 16);
      onStrokesChange(
        erased.map((stroke) => ({
          ...stroke,
          points: stroke.points.flatMap((v, i) =>
            i % 2 === 0 ? [v / width] : [v / height],
          ),
        })),
      );
      return;
    }

    const [nx, ny] = toNorm(point.x, point.y, width, height);
    draftRef.current = [nx, ny];
    redraw();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingEnabled || !drawingRef.current) return;
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;

    if (tool === "eraser") {
      const pixelStrokes = strokesRef.current.map((stroke) => ({
        ...stroke,
        points: stroke.points.flatMap((v, i) =>
          i % 2 === 0 ? [v * width] : [v * height],
        ),
      }));
      const erased = eraseStrokesAt(pixelStrokes, point.x, point.y, 16);
      onStrokesChange(
        erased.map((stroke) => ({
          ...stroke,
          points: stroke.points.flatMap((v, i) =>
            i % 2 === 0 ? [v / width] : [v / height],
          ),
        })),
      );
      return;
    }

    const [nx, ny] = toNorm(point.x, point.y, width, height);
    draftRef.current.push(nx, ny);
    redraw();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingEnabled || !drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;

    if (tool === "eraser") {
      draftRef.current = [];
      return;
    }

    const minPoints = tool === "laser" ? 2 : 4;
    if (draftRef.current.length >= minPoints) {
      const stroke: VideoAnnotationStroke = {
        id: `stroke_${crypto.randomUUID()}`,
        time: anchorTimeRef.current,
        points: [...draftRef.current],
        color: tool === "laser" ? "#ef4444" : inkColor,
        width: tool === "laser" ? Math.max(3, inkWidth + 1) : inkWidth,
        kind: tool === "laser" ? "laser" : "pen",
      };
      onStrokeComplete(stroke);
    }
    draftRef.current = [];
    redraw();
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fc-film-annotation-canvas${drawingEnabled ? " is-drawing" : ""}`}
      style={{ pointerEvents: drawingEnabled ? "auto" : "none" }}
      aria-hidden={!drawingEnabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
