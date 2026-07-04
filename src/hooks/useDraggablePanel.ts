"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const VIEWPORT_PAD_PX = 16;

function clampPanelOffset(
  next: { x: number; y: number },
  panel: HTMLElement | null,
) {
  if (!panel) return next;
  const rect = panel.getBoundingClientRect();
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  let left = centerX - rect.width / 2 + next.x;
  let top = centerY - rect.height / 2 + next.y;
  left = Math.min(
    Math.max(VIEWPORT_PAD_PX, left),
    window.innerWidth - rect.width - VIEWPORT_PAD_PX,
  );
  top = Math.min(
    Math.max(VIEWPORT_PAD_PX, top),
    window.innerHeight - rect.height - VIEWPORT_PAD_PX,
  );
  return {
    x: left - (centerX - rect.width / 2),
    y: top - (centerY - rect.height / 2),
  };
}

export function useDraggablePanel(resetKey?: string) {
  const panelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    ox: number;
    oy: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    offsetRef.current = { x: 0, y: 0 };
    setOffset({ x: 0, y: 0 });
  }, [resetKey]);

  const applyOffset = useCallback((next: { x: number; y: number }) => {
    const clamped = clampPanelOffset(next, panelRef.current);
    offsetRef.current = clamped;
    setOffset(clamped);
  }, []);

  const headerProps = {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest("a, button, input, label")) return;
      event.preventDefault();
      const header = event.currentTarget;
      header.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      };
      setDragging(true);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      applyOffset({
        x: drag.ox + event.clientX - drag.startX,
        y: drag.oy + event.clientY - drag.startY,
      });
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
    },
  };

  const panelStyle: CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  };

  return {
    panelRef,
    panelStyle,
    headerProps,
    dragging,
  };
}
