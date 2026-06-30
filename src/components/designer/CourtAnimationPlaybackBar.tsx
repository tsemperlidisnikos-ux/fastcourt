"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { useFrameAnimationPlayback } from "@/hooks/useFrameAnimationPlayback";
import { PlaybackSpeedPopover } from "@/components/designer/PlaybackSpeedPopover";

interface Props {
  playback: ReturnType<typeof useFrameAnimationPlayback>;
  disabled?: boolean;
}

export function CourtAnimationPlaybackBar({ playback, disabled = false }: Props) {
  const {
    playing,
    paused,
    progress,
    phaseLabel,
    canPlay,
    togglePlayPause,
    pause,
    resume,
    seekToProgress,
  } = playback;

  const inactive = disabled || !canPlay;
  const showPause = playing && !paused;
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
      className={`ds-court-playback-bar${playing || paused || scrubbing ? " is-active" : ""}${scrubbing ? " is-scrubbing" : ""}`}
      aria-label="Animation playback"
    >
      <div
        ref={progressTrackRef}
        className="ds-court-playback-progress"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
        aria-label="Play progress"
        onPointerDown={onProgressPointerDown}
      >
        <div
          className="ds-court-playback-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="ds-court-playback-controls">
        <div className="ds-court-playback-main">
          <button
            type="button"
            className="ds-court-playback-btn"
            disabled={inactive}
            aria-label={showPause ? "Pause animation" : "Play animation"}
            onClick={() => {
              if (inactive) return;
              togglePlayPause();
            }}
          >
            {showPause ? (
              <span className="ds-court-playback-icon" aria-hidden="true">
                <span className="ds-court-playback-pause-bar" />
                <span className="ds-court-playback-pause-bar" />
              </span>
            ) : (
              <span className="ds-court-playback-icon ds-court-playback-play" aria-hidden="true">
                ▶
              </span>
            )}
          </button>
          <div className="ds-court-playback-phase">{phaseLabel}</div>
        </div>
        <div className="ds-court-playback-util">
          <PlaybackSpeedPopover />
        </div>
      </div>
    </div>
  );
}
