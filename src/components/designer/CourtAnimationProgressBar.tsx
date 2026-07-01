"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { useFrameAnimationPlayback } from "@/hooks/useFrameAnimationPlayback";

interface Props {
  playback: ReturnType<typeof useFrameAnimationPlayback>;
  disabled?: boolean;
  className?: string;
}

export function CourtAnimationProgressBar({
  playback,
  disabled = false,
  className = "",
}: Props) {
  const { playing, progress, canPlay, pause, resume, seekToProgress } = playback;

  const inactive = disabled || !canPlay;
  const progressPct = Math.round(progress * 100);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const wasPlayingRef = useRef(false);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = progressTrackRef.current;
      if (!track || inactive) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      seekToProgress(ratio);
    },
    [inactive, seekToProgress],
  );

  const endScrub = useCallback(() => {
    setScrubbing(false);
    if (wasPlayingRef.current) {
      wasPlayingRef.current = false;
      resume();
    }
  }, [resume]);

  useEffect(() => {
    if (!scrubbing) return;

    function onPointerMove(event: PointerEvent) {
      seekFromClientX(event.clientX);
    }

    function onPointerUp() {
      endScrub();
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [endScrub, scrubbing, seekFromClientX]);

  const onProgressPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (inactive) return;
      event.preventDefault();
      wasPlayingRef.current = playing;
      if (playing) pause();
      setScrubbing(true);
      seekFromClientX(event.clientX);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [inactive, pause, playing, seekFromClientX],
  );

  return (
    <div
      ref={progressTrackRef}
      className={`ds-court-playback-progress${scrubbing ? " is-scrubbing" : ""}${className ? ` ${className}` : ""}`}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPct}
      aria-label="Play progress"
      aria-disabled={inactive}
      onPointerDown={onProgressPointerDown}
    >
      <div
        className="ds-court-playback-progress-fill"
        style={{ width: `${progressPct}%` }}
      />
    </div>
  );
}
