"use client";

import {
  clampMarkupToolbarPosition,
  defaultMarkupToolbarPosition,
} from "@/lib/film-room/markup-toolbar-position";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

interface Props {
  boundsRef: RefObject<HTMLDivElement | null>;
  boundsWidth: number;
  boundsHeight: number;
  children: ReactNode;
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
      <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="13.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="13.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function FilmRoomFloatingMarkupToolbar({
  boundsRef,
  boundsWidth,
  boundsHeight,
  children,
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const moveOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  useEffect(() => {
    const element = dockRef.current;
    if (!element) return;

    const measure = () => {
      setSize({
        width: element.offsetWidth,
        height: element.offsetHeight,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (boundsWidth <= 0 || boundsHeight <= 0 || size.width <= 0 || size.height <= 0) {
      return;
    }
    setPosition((current) => {
      if (!current) {
        return defaultMarkupToolbarPosition(
          boundsWidth,
          boundsHeight,
          size.width,
          size.height,
        );
      }
      return clampMarkupToolbarPosition(
        current.x,
        current.y,
        boundsWidth,
        boundsHeight,
        size.width,
        size.height,
      );
    });
  }, [boundsHeight, boundsWidth, size.height, size.width]);

  const resolveBoundsRect = useCallback(() => {
    return boundsRef.current?.getBoundingClientRect() ?? null;
  }, [boundsRef]);

  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      const bounds = resolveBoundsRect();
      if (!bounds || !position) return;
      moveOffsetRef.current = {
        x: clientX - bounds.left - position.x,
        y: clientY - bounds.top - position.y,
      };
      draggingRef.current = true;
      setMoving(true);
    },
    [position, resolveBoundsRect],
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingRef.current) return;
      const bounds = resolveBoundsRect();
      if (!bounds || size.width <= 0 || size.height <= 0) return;
      const next = clampMarkupToolbarPosition(
        clientX - bounds.left - moveOffsetRef.current.x,
        clientY - bounds.top - moveOffsetRef.current.y,
        boundsWidth,
        boundsHeight,
        size.width,
        size.height,
      );
      setPosition(next);
    },
    [boundsHeight, boundsWidth, resolveBoundsRect, size.height, size.width],
  );

  const handleDragEnd = useCallback(() => {
    draggingRef.current = false;
    setMoving(false);
  }, []);

  const ready = Boolean(position && boundsWidth > 0 && boundsHeight > 0);

  return (
    <div
      ref={dockRef}
      className={`fc-film-markup-toolbar-dock${moving ? " is-moving" : ""}${ready ? "" : " is-measuring"}`}
      style={
        ready
          ? {
              left: position!.x,
              top: position!.y,
            }
          : undefined
      }
    >
      <button
        type="button"
        className="fc-film-markup-drag-handle"
        title="Drag drawing toolbar"
        aria-label="Move drawing toolbar"
        disabled={!ready}
        onPointerDown={(event) => {
          if (event.button !== 0 || !ready) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          handleDragStart(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          event.preventDefault();
          handleDragMove(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          handleDragEnd();
        }}
        onPointerCancel={() => {
          if (!draggingRef.current) return;
          handleDragEnd();
        }}
      >
        <DragHandleIcon />
      </button>
      {children}
    </div>
  );
}
