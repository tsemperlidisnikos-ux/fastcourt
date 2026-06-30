"use client";

import { eraseStrokesAt } from "@/lib/designer/stroke-partial-eraser";
import { useCallback, useEffect, useRef } from "react";

export interface InkStroke {
  points: number[];
  color: string;
  width: number;
}

const ERASER_RADIUS = 14;

function drawStroke(ctx: CanvasRenderingContext2D, stroke: InkStroke) {
  if (stroke.points.length < 4) return;
  ctx.beginPath();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.moveTo(stroke.points[0], stroke.points[1]);
  for (let i = 2; i < stroke.points.length; i += 2) {
    ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
  }
  ctx.stroke();
}

function redrawInkCanvas(
  canvas: HTMLCanvasElement,
  strokes: InkStroke[],
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) {
    drawStroke(ctx, stroke);
  }
}

interface Props {
  width: number;
  height: number;
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  inkColor: string;
  inkWidth: number;
  tool: "pen" | "eraser";
  enabled: boolean;
}

export function PracticeSheetInkLayer({
  width,
  height,
  strokes,
  onStrokesChange,
  inkColor,
  inkWidth,
  tool,
  enabled,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const draftRef = useRef<number[]>([]);
  const strokesRef = useRef(strokes);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    canvas.width = width;
    canvas.height = height;
    redrawInkCanvas(canvas, strokes);
  }, [width, height, strokes]);

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    if (!point) return;

    drawingRef.current = true;
    if (tool === "pen") {
      draftRef.current = [point.x, point.y];
    } else {
      onStrokesChange(
        eraseStrokesAt(strokesRef.current, point.x, point.y, ERASER_RADIUS),
      );
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || !drawingRef.current) return;
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;

    if (tool === "pen") {
      draftRef.current.push(point.x, point.y);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      redrawInkCanvas(canvas, strokes);
      drawStroke(ctx, {
        points: draftRef.current,
        color: inkColor,
        width: inkWidth,
      });
      return;
    }

    onStrokesChange(
      eraseStrokesAt(strokesRef.current, point.x, point.y, ERASER_RADIUS),
    );
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!enabled || !drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;

    if (tool === "pen" && draftRef.current.length >= 4) {
      onStrokesChange([
        ...strokes,
        {
          points: [...draftRef.current],
          color: inkColor,
          width: inkWidth,
        },
      ]);
    }
    draftRef.current = [];
  }

  return (
    <canvas
      ref={canvasRef}
      className={`fc-practice-sheet-ink${enabled ? " is-active" : ""}`}
      aria-label={enabled ? "Practice sheet drawing area" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
