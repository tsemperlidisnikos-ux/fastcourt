"use client";

import { useMemo, useState } from "react";
import { CourtAnimationProgressBar } from "@/components/designer/CourtAnimationProgressBar";
import { AnimationPlaybackControls } from "@/components/designer/AnimationPlaybackControls";
import { formatActionTimelineLabel } from "@/lib/designer/action-timeline-label";
import type { useFrameAnimationPlayback } from "@/hooks/useFrameAnimationPlayback";
import { useDesignerStore } from "@/stores/designer-store";
import type { ActionTiming } from "@/types/designer";

function timingClass(timing: ActionTiming | undefined) {
  if (timing === "sync") return "is-sync";
  if (timing === "optional") return "is-optional";
  return "is-normal";
}

interface Props {
  variant?: "dock" | "sidebar";
  showHeading?: boolean;
  playback?: ReturnType<typeof useFrameAnimationPlayback>;
  playbackDisabled?: boolean;
}

export function ActionTimeline({
  variant = "sidebar",
  showHeading = true,
  playback,
  playbackDisabled = false,
}: Props) {
  const frameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const play = useDesignerStore((s) => s.play);
  const selectedActionId = useDesignerStore((s) => s.selectedActionId);
  const reorder = useDesignerStore((s) => s.reorderActionSequence);
  const setTiming = useDesignerStore((s) => s.setActionTiming);
  const selectAction = useDesignerStore((s) => s.selectAction);

  const frame = play.frames[frameIndex];
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const entries = useMemo(() => {
    const seq = frame?.actionSequence ?? frame?.actions.map((a) => a.id) ?? [];
    const byId = new Map((frame?.actions ?? []).map((a) => [a.id, a]));
    return seq.map((id) => byId.get(id)).filter(Boolean);
  }, [frame]);

  if (!frame) return null;

  function toggleSync(actionId: string, current?: ActionTiming) {
    setTiming(actionId, current === "sync" ? "normal" : "sync");
  }

  function toggleOptional(actionId: string, current?: ActionTiming) {
    setTiming(actionId, current === "optional" ? "normal" : "optional");
  }

  return (
    <div
      className={`action-timeline${variant === "dock" ? " action-timeline--dock" : ""}${playback && variant === "dock" ? " action-timeline--dock-has-progress" : ""}`}
      id="action-timeline"
    >
      {showHeading ? (
        <div className="action-timeline-heading">
          <span className="action-timeline-title">Action Timeline</span>
        </div>
      ) : null}
      {variant === "sidebar" ? (
        <p className="ds-prop-hint action-sequence-hint">
          Drag to reorder. Sync (⟲) runs actions together; Optional (↱) is skipped
          during playback.
        </p>
      ) : null}
      <div className={variant === "dock" ? "action-timeline-dock-frame" : undefined}>
      <ul className="action-sequence-list action-timeline-list" id="action-sequence-list">
        {entries.length === 0 ? (
          <li className="action-sequence-empty">No actions on this frame.</li>
        ) : (
          entries.map((action, index) => {
            if (!action) return null;
            const selected = action.id === selectedActionId;
            return (
              <li
                key={action.id}
                className={`action-sequence-item action-timeline-item ${timingClass(action.timing)}${selected ? " is-selected" : ""}`}
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
                <span className="action-sequence-drag" title="Drag to reorder" aria-hidden="true">
                  ⠿
                </span>
                <span className="action-sequence-label action-timeline-label">
                  {formatActionTimelineLabel(action, frame)}
                </span>
                <div className="action-sequence-timing-group">
                  <button
                    type="button"
                    className={`action-sequence-timing ${action.timing === "sync" ? "is-active" : ""}`}
                    title="Sync — run with previous action"
                    aria-pressed={action.timing === "sync"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSync(action.id, action.timing);
                    }}
                  >
                    ⟲
                  </button>
                  <button
                    type="button"
                    className={`action-sequence-timing ${action.timing === "optional" ? "is-active" : ""}`}
                    title="Optional — skip during playback"
                    aria-pressed={action.timing === "optional"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOptional(action.id, action.timing);
                    }}
                  >
                    ↱
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
      {playback && variant === "dock" ? (
        <CourtAnimationProgressBar
          playback={playback}
          disabled={playbackDisabled}
          className="action-timeline-dock-progress"
        />
      ) : null}
      </div>
      {playback && variant === "dock" ? (
        <AnimationPlaybackControls
          playback={playback}
          disabled={playbackDisabled}
        />
      ) : null}
    </div>
  );
}
