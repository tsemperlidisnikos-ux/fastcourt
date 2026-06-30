"use client";

import { playHasExportableAnimation } from "@/lib/designer/animation-export";
import { useFrameAnimationPlayback } from "@/hooks/useFrameAnimationPlayback";
import { ActionTimeline } from "@/components/designer/ActionTimeline";
import { useDesignerStore } from "@/stores/designer-store";

interface Props {
  playback: ReturnType<typeof useFrameAnimationPlayback>;
  exportingAnim?: boolean;
  canExportMp4?: boolean;
  onExportMp4?: () => void;
}

export function ActionSequencePanel({
  playback,
  exportingAnim = false,
  canExportMp4 = false,
  onExportMp4,
}: Props) {
  const play = useDesignerStore((s) => s.play);
  const setAnimPauseMs = useDesignerStore((s) => s.setAnimPauseMs);
  const exportablePlay = playHasExportableAnimation(play);

  return (
    <div className="ds-sidebar-anim-pane">
      <div className="ds-anim-playback-bar" role="toolbar" aria-label="Animation playback">
        <button
          type="button"
          className="ds-anim-playback-btn is-primary"
          disabled={playback.playing || (!playback.paused && playback.actionCount === 0)}
          onClick={playback.startFullPlay}
        >
          Play
        </button>
        <button
          type="button"
          className="ds-anim-playback-btn"
          disabled={!playback.playing && !playback.paused}
          onClick={playback.stop}
        >
          Stop
        </button>
        <button
          type="button"
          className="ds-anim-playback-btn"
          disabled={playback.playing || playback.actionCount === 0}
          onClick={playback.stepOnce}
        >
          Step
        </button>
        <span className="ds-anim-playback-status" aria-live="polite">
          {playback.playing
            ? `Playing ${playback.stepIndex + 1}/${playback.actionCount}`
            : `${playback.actionCount} action(s)`}
        </span>
        {onExportMp4 ? (
          <button
            type="button"
            className="ds-anim-playback-btn ds-anim-export-mp4-btn"
            disabled={
              exportingAnim ||
              playback.playing ||
              playback.paused ||
              !canExportMp4 ||
              !exportablePlay
            }
            title={
              !canExportMp4
                ? "MP4 export requires Chrome or Edge"
                : !exportablePlay
                  ? "Add at least one action to export animation"
                  : "Export full play animation as MP4 video"
            }
            onClick={onExportMp4}
          >
            {exportingAnim ? "Exporting…" : "Export MP4"}
          </button>
        ) : null}
      </div>

      <label className="ds-prop-label" style={{ paddingTop: 12 }}>
        Pause between frames (ms)
      </label>
      <input
        type="range"
        id="anim-pause"
        min={0}
        max={3000}
        step={100}
        value={play.animPauseMs ?? 800}
        style={{ width: "100%", marginBottom: 4 }}
        onChange={(e) => setAnimPauseMs(Number(e.target.value))}
      />
      <span id="anim-pause-label" className="ds-anim-value">
        {play.animPauseMs ?? 800} ms
      </span>

      <div className="action-sequence-panel" id="action-sequence-panel" style={{ paddingTop: 16 }}>
        <ActionTimeline variant="sidebar" />
      </div>
    </div>
  );
}
