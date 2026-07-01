"use client";

import type { useFrameAnimationPlayback } from "@/hooks/useFrameAnimationPlayback";
import { PlaybackSpeedPopover } from "@/components/designer/PlaybackSpeedPopover";

interface Props {
  playback: ReturnType<typeof useFrameAnimationPlayback>;
  disabled?: boolean;
  className?: string;
}

export function AnimationPlaybackControls({
  playback,
  disabled = false,
  className = "",
}: Props) {
  const { playing, paused, phaseLabel, canPlay, togglePlayPause } = playback;

  const inactive = disabled || !canPlay;
  const showPause = playing && !paused;

  return (
    <div
      className={`ds-court-playback-controls action-timeline-dock-controls${playing || paused ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      aria-label="Animation playback"
    >
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
  );
}
