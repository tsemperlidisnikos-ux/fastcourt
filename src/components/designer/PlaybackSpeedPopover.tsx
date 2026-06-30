"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_PLAYBACK_SPEED,
  MIN_PLAYBACK_SPEED,
  resolvePlaybackSpeed,
} from "@/lib/designer/animation-timing";
import { useDesignerStore } from "@/stores/designer-store";

function formatPlaybackSpeed(speed: number) {
  const rounded = Math.round(speed * 10) / 10;
  return `${rounded.toFixed(1)}x`;
}

export function PlaybackSpeedPopover() {
  const play = useDesignerStore((s) => s.play);
  const setAnimSpeed = useDesignerStore((s) => s.setAnimSpeed);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const speed = resolvePlaybackSpeed(play.animSpeed);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="ds-playback-speed-anchor" ref={rootRef}>
      <button
        type="button"
        className="ds-court-playback-util-btn ds-court-playback-gear-btn"
        title="Playback speed"
        aria-label="Playback speed"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg
          className="ds-court-playback-gear-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.02 7.02 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.94 2h-3.88a.5.5 0 0 0-.49.41l-.36 2.54a7.02 7.02 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.66 9.01a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.5.38 1.04.69 1.63.94l.36 2.54c.05.28.29.47.57.47h3.88c.28 0 .52-.19.57-.47l.36-2.54c.59-.25 1.13-.56 1.63-.94l2.39.96c.26.11.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
          />
        </svg>
      </button>
      {open ? (
        <div className="ds-playback-speed-popover" role="dialog" aria-label="Playback speed">
          <div className="ds-playback-speed-popover-title">Playback Speed</div>
          <input
            type="range"
            className="ds-playback-speed-popover-slider"
            min={MIN_PLAYBACK_SPEED}
            max={MAX_PLAYBACK_SPEED}
            step={0.1}
            value={speed}
            onChange={(e) => setAnimSpeed(Number(e.target.value))}
            aria-label="Playback speed"
          />
          <div className="ds-playback-speed-popover-value">{formatPlaybackSpeed(speed)}</div>
        </div>
      ) : null}
    </div>
  );
}
