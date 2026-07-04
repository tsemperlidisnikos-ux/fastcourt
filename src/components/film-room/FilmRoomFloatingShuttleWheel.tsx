"use client";

import { FilmRoomShuttleWheel } from "@/components/film-room/FilmRoomShuttleWheel";
import {
  clampShuttlePosition,
  defaultShuttlePosition,
  SHUTTLE_WHEEL_SIZE_PX,
} from "@/lib/film-room/shuttle-position";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

interface Props {
  boundsRef: RefObject<HTMLDivElement | null>;
  boundsWidth: number;
  boundsHeight: number;
  disabled?: boolean;
  playing?: boolean;
  onTogglePlay?: () => void;
  onJogStart?: () => void;
  onJog: (deltaSeconds: number) => void;
  onJogEnd?: () => void;
}

export function FilmRoomFloatingShuttleWheel({
  boundsRef,
  boundsWidth,
  boundsHeight,
  disabled = false,
  playing = false,
  onTogglePlay,
  onJogStart,
  onJog,
  onJogEnd,
}: Props) {
  const widgetSize = SHUTTLE_WHEEL_SIZE_PX;

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const moveOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (boundsWidth <= 0 || boundsHeight <= 0) return;
    setPosition((current) => {
      if (!current) {
        return defaultShuttlePosition(boundsWidth, boundsHeight);
      }
      return clampShuttlePosition(
        current.x,
        current.y,
        boundsWidth,
        boundsHeight,
        widgetSize,
        widgetSize,
      );
    });
  }, [boundsHeight, boundsWidth, widgetSize]);

  const resolveBoundsRect = useCallback(() => {
    return boundsRef.current?.getBoundingClientRect() ?? null;
  }, [boundsRef]);

  const handleMoveStart = useCallback(
    (clientX: number, clientY: number) => {
      const bounds = resolveBoundsRect();
      if (!bounds || !position) return;
      moveOffsetRef.current = {
        x: clientX - bounds.left - position.x,
        y: clientY - bounds.top - position.y,
      };
      setMoving(true);
    },
    [position, resolveBoundsRect],
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const bounds = resolveBoundsRect();
      if (!bounds) return;
      const next = clampShuttlePosition(
        clientX - bounds.left - moveOffsetRef.current.x,
        clientY - bounds.top - moveOffsetRef.current.y,
        boundsWidth,
        boundsHeight,
        widgetSize,
        widgetSize,
      );
      setPosition(next);
    },
    [boundsHeight, boundsWidth, resolveBoundsRect, widgetSize],
  );

  const handleMoveEnd = useCallback(() => {
    setMoving(false);
  }, []);

  if (!position || boundsWidth <= 0 || boundsHeight <= 0) {
    return null;
  }

  return (
    <div
      className={`fc-film-shuttle-float${moving ? " is-moving" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: widgetSize,
      }}
      aria-label="Shuttle wheel"
    >
      <FilmRoomShuttleWheel
        disabled={disabled}
        playing={playing}
        moving={moving}
        onTogglePlay={onTogglePlay}
        onMoveStart={handleMoveStart}
        onMove={handleMove}
        onMoveEnd={handleMoveEnd}
        onJogStart={onJogStart}
        onJog={onJog}
        onJogEnd={onJogEnd}
      />
    </div>
  );
}
