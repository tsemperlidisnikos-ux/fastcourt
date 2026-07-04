"use client";

import { SHUTTLE_LONG_PRESS_MS } from "@/lib/film-room/shuttle-position";
import {
  angleDeltaToSeekSeconds,
  pointerAngleFromCenter,
} from "@/lib/film-room/shuttle-wheel";
import { useCallback, useEffect, useRef, useState } from "react";

const JOG_MOVE_THRESHOLD_PX = 8;

type GestureMode = "idle" | "pending" | "jog" | "move";

interface Props {
  disabled?: boolean;
  playing?: boolean;
  moving?: boolean;
  onTogglePlay?: () => void;
  onMoveStart?: (clientX: number, clientY: number) => void;
  onMove?: (clientX: number, clientY: number) => void;
  onMoveEnd?: () => void;
  onJogStart?: () => void;
  onJog: (deltaSeconds: number) => void;
  onJogEnd?: () => void;
}

export function FilmRoomShuttleWheel({
  disabled = false,
  playing = false,
  moving = false,
  onTogglePlay,
  onMoveStart,
  onMove,
  onMoveEnd,
  onJogStart,
  onJog,
  onJogEnd,
}: Props) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<GestureMode>("idle");
  const lastAngleRef = useRef(0);
  const startPointRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jogActive, setJogActive] = useState(false);
  const [longPressPending, setLongPressPending] = useState(false);
  const [visualRotation, setVisualRotation] = useState(0);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressPending(false);
  }, []);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  const beginJog = useCallback(
    (clientX: number, clientY: number) => {
      const wheel = wheelRef.current;
      if (!wheel || modeRef.current !== "pending") return;
      clearLongPressTimer();
      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      lastAngleRef.current = pointerAngleFromCenter(clientX, clientY, cx, cy);
      modeRef.current = "jog";
      setJogActive(true);
      onJogStart?.();
    },
    [clearLongPressTimer, onJogStart],
  );

  const finishGesture = useCallback(() => {
    clearLongPressTimer();
    if (modeRef.current === "jog") {
      onJogEnd?.();
    }
    if (modeRef.current === "move") {
      onMoveEnd?.();
    }
    modeRef.current = "idle";
    setJogActive(false);
  }, [clearLongPressTimer, onJogEnd, onMoveEnd]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const wheel = wheelRef.current;
      if (!wheel) return;

      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < rect.width * 0.18) return;

      e.preventDefault();
      e.stopPropagation();
      wheel.setPointerCapture(e.pointerId);

      modeRef.current = "pending";
      startPointRef.current = { x: e.clientX, y: e.clientY };
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setLongPressPending(true);

      longPressTimerRef.current = setTimeout(() => {
        if (modeRef.current !== "pending") return;
        modeRef.current = "move";
        setLongPressPending(false);
        onMoveStart?.(lastPointerRef.current.x, lastPointerRef.current.y);
      }, SHUTTLE_LONG_PRESS_MS);
    },
    [disabled, onMoveStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const mode = modeRef.current;
      if (mode === "idle") return;

      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      if (mode === "pending") {
        const dx = e.clientX - startPointRef.current.x;
        const dy = e.clientY - startPointRef.current.y;
        if (Math.hypot(dx, dy) >= JOG_MOVE_THRESHOLD_PX) {
          beginJog(e.clientX, e.clientY);
        }
        return;
      }

      e.preventDefault();

      if (mode === "move") {
        onMove?.(e.clientX, e.clientY);
        return;
      }

      if (mode !== "jog") return;
      const wheel = wheelRef.current;
      if (!wheel) return;

      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = pointerAngleFromCenter(e.clientX, e.clientY, cx, cy);
      const delta = angle - lastAngleRef.current;
      lastAngleRef.current = angle;

      const seekDelta = angleDeltaToSeekSeconds(delta);
      if (seekDelta !== 0) {
        onJog(seekDelta);
        setVisualRotation((rotation) => rotation + (delta * 180) / Math.PI);
      }
    },
    [beginJog, disabled, onJog, onMove],
  );

  return (
    <div
      ref={wheelRef}
      className={`fc-film-shuttle-wheel${jogActive ? " is-active" : ""}${moving ? " is-moving" : ""}${longPressPending ? " is-long-press-pending" : ""}${disabled ? " is-disabled" : ""}`}
      role="slider"
      aria-label="Shuttle wheel — hold to move, rotate to scrub"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={50}
      tabIndex={disabled ? -1 : 0}
      title="Hold to move · rotate to scrub"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      onLostPointerCapture={finishGesture}
    >
      <div
        className="fc-film-shuttle-wheel-dial"
        style={{ transform: `rotate(${visualRotation}deg)` }}
        aria-hidden="true"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="fc-film-shuttle-wheel-tick"
            style={{ transform: `rotate(${i * 30}deg)` }}
          />
        ))}
      </div>
      <button
        type="button"
        className="fc-film-shuttle-wheel-play"
        title={playing ? "Pause" : "Play"}
        aria-label={playing ? "Pause video" : "Play video"}
        disabled={disabled}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePlay?.();
        }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M8 6h3v12H8V6zm5 0h3v12h-3V6z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
