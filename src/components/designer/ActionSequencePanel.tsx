"use client";

import { useMemo, useState } from "react";
import { useFrameAnimationPlayback } from "@/hooks/useFrameAnimationPlayback";
import { useDesignerStore } from "@/stores/designer-store";
import type { ActionTiming } from "@/types/designer";

const TIMING_CYCLE: ActionTiming[] = ["normal", "optional", "sync"];

function timingLabel(timing: ActionTiming | undefined) {
  if (timing === "sync") return "Sync";
  if (timing === "optional") return "Opt";
  return "";
}

function timingClass(timing: ActionTiming | undefined) {
  if (timing === "sync") return "is-sync";
  if (timing === "optional") return "is-optional";
  return "is-normal";
}

export function ActionSequencePanel() {
  const play = useDesignerStore((s) => s.play);
  const frameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const setAnimSpeed = useDesignerStore((s) => s.setAnimSpeed);
  const setAnimPauseMs = useDesignerStore((s) => s.setAnimPauseMs);
  const reorder = useDesignerStore((s) => s.reorderActionSequence);
  const setTiming = useDesignerStore((s) => s.setActionTiming);
  const selectAction = useDesignerStore((s) => s.selectAction);
  const playback = useFrameAnimationPlayback();

  const frame = play.frames[frameIndex];
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const entries = useMemo(() => {
    const seq = frame?.actionSequence ?? frame?.actions.map((a) => a.id) ?? [];
    const byId = new Map((frame?.actions ?? []).map((a) => [a.id, a]));
    return seq.map((id) => byId.get(id)).filter(Boolean);
  }, [frame]);

  if (!frame) return null;

  function cycleTiming(actionId: string, current?: ActionTiming) {
    const idx = TIMING_CYCLE.indexOf(current ?? "normal");
    const next = TIMING_CYCLE[(idx + 1) % TIMING_CYCLE.length];
    setTiming(actionId, next);
  }

  return (
    <div className="ds-sidebar-anim-pane">
      <div className="ds-anim-playback-bar" role="toolbar" aria-label="Animation playback">
        <button
          type="button"
          className="ds-anim-playback-btn is-primary"
          disabled={playback.playing || playback.actionCount === 0}
          onClick={playback.start}
        >
          Play
        </button>
        <button
          type="button"
          className="ds-anim-playback-btn"
          disabled={!playback.playing}
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
      </div>

      <label className="ds-prop-label">Playback speed</label>
      <input
        type="range"
        id="anim-speed"
        min={0.25}
        max={2}
        step={0.05}
        value={play.animSpeed ?? 1}
        style={{ width: "100%", marginBottom: 4 }}
        onChange={(e) => setAnimSpeed(Number(e.target.value))}
      />
      <span id="anim-speed-label" className="ds-anim-value">
        {(play.animSpeed ?? 1).toFixed(1)}x
      </span>

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

      <div className="action-sequence-panel" id="action-sequence-panel">
        <label className="ds-prop-label" style={{ paddingTop: 16 }}>
          Action order
        </label>
        <p className="ds-prop-hint action-sequence-hint">
          Drag to reorder. Click timing badge to cycle. Sync runs together;
          Optional skipped during playback.
        </p>
        <ul className="action-sequence-list" id="action-sequence-list">
          {entries.length === 0 ? (
            <li className="action-sequence-empty">No actions on this frame.</li>
          ) : (
            entries.map((action, index) => {
              if (!action) return null;
              return (
                <li
                  key={action.id}
                  className={`action-sequence-item ${timingClass(action.timing)}`}
                  draggable
                  data-seq-index={index}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex != null) reorder(dragIndex, index);
                    setDragIndex(null);
                  }}
                  onClick={() => selectAction(action.id)}
                >
                  <span className="action-sequence-drag" title="Drag to reorder">
                    ⠿
                  </span>
                  <span className="action-sequence-label">{action.type}</span>
                  <button
                    type="button"
                    className="action-sequence-timing"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleTiming(action.id, action.timing);
                    }}
                  >
                    {timingLabel(action.timing) || "•"}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
