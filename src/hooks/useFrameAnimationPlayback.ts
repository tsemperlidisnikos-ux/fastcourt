"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
import {
  computeAnimStepState,
  getPlaybackActionIds,
  lerpObjects,
} from "@/lib/designer/animation-engine";
import { useDesignerStore } from "@/stores/designer-store";

const BASE_STEP_MS = 720;
const FRAME_TRANSITION_MS = 520;

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function useFrameAnimationPlayback() {
  const play = useDesignerStore((s) => s.play);
  const frameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const setAnimRuntime = useDesignerStore((s) => s.setAnimRuntime);
  const selectAction = useDesignerStore((s) => s.selectAction);
  const nextFrame = useDesignerStore((s) => s.nextFrame);
  const selectFrame = useDesignerStore((s) => s.selectFrame);

  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const phaseRef = useRef<"action" | "transition">("action");
  const tickRef = useRef<(now: number) => void>(() => {});

  const frame = play.frames[frameIndex];
  const actionIds = useMemo(
    () => (frame ? getPlaybackActionIds(frame) : []),
    [frame],
  );

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
    setStepIndex(0);
    phaseRef.current = "action";
    setAnimRuntime(null);
    selectAction(null);
  }, [selectAction, setAnimRuntime]);

  const tick = useCallback(
    (now: number) => {
      if (!frame) {
        stop();
        return;
      }

      const speed = play.animSpeed ?? 1;
      const elapsed = now - startRef.current;

      if (phaseRef.current === "action") {
        const stepMs = BASE_STEP_MS / speed;
        const local = Math.min(1, elapsed / stepMs);
        const eased = easeInOut(local);
        const lineProgress = Math.min(1, eased / 0.62);
        const moveProgress = Math.min(1, Math.max(0, (eased - 0.18) / 0.82));
        const state = computeAnimStepState(frame, stepIndex, moveProgress, lineProgress);

        setAnimRuntime({
          active: true,
          objects: state.objects,
          activeActionId: state.activeActionId,
          revealedActionIds: state.revealedActionIds,
          lineProgress: state.lineProgress,
        });
        selectAction(state.activeActionId);

        if (local >= 1) {
          const next = stepIndex + 1;
          if (next < actionIds.length) {
            setStepIndex(next);
            startRef.current = now;
            rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
            return;
          }

          if (frameIndex < play.frames.length - 1) {
            phaseRef.current = "transition";
            startRef.current = now;
            rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
            return;
          }

          stop();
          return;
        }
      } else {
        const nextFrameData = play.frames[frameIndex + 1];
        const transitioned = applyActionResultsToFrame(frame, nextFrameData, {
          clearActions: false,
        });
        const fromObjs = computeAnimStepState(
          frame,
          actionIds.length,
          1,
          1,
        ).objects;
        const t = Math.min(1, elapsed / (FRAME_TRANSITION_MS / speed));
        const eased = easeInOut(t);
        const objects = lerpObjects(fromObjs, transitioned.objects, eased);

        setAnimRuntime({
          active: true,
          objects,
          activeActionId: null,
          revealedActionIds: actionIds,
          lineProgress: 1,
        });

        if (t >= 1) {
          const pauseMs = (play.animPauseMs ?? 800) / speed;
          setTimeout(() => {
            nextFrame();
            setStepIndex(0);
            phaseRef.current = "action";
            startRef.current = performance.now();
            rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
          }, pauseMs);
          return;
        }
      }

      rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
    },
    [
      actionIds,
      frame,
      frameIndex,
      nextFrame,
      play.animPauseMs,
      play.animSpeed,
      play.frames,
      selectAction,
      setAnimRuntime,
      stepIndex,
      stop,
    ],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const start = useCallback(() => {
    stop();
    if (!frame || !actionIds.length) return;
    setPlaying(true);
    setStepIndex(0);
    phaseRef.current = "action";
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
  }, [actionIds.length, frame, stop]);

  const stepOnce = useCallback(() => {
    stop();
    if (!frame || !actionIds.length) return;
    const next = (stepIndex + 1) % actionIds.length;
    const state = computeAnimStepState(frame, next, 1, 1);
    setStepIndex(next);
    setAnimRuntime({
      active: true,
      objects: state.objects,
      activeActionId: state.activeActionId,
      revealedActionIds: state.revealedActionIds,
      lineProgress: 1,
    });
    selectAction(state.activeActionId);
  }, [actionIds.length, frame, selectAction, setAnimRuntime, stepIndex, stop]);

  useEffect(() => () => stop(), [frameIndex, stop]);

  return {
    playing,
    stepIndex,
    actionCount: actionIds.length,
    start,
    stop,
    stepOnce,
    restartFromFrame: () => selectFrame(frameIndex),
  };
}
