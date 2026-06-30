"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
import {
  buildAnimationSteps,
  computeAnimStepState,
  computeAnimStepStateAtEased,
  lerpObjects,
} from "@/lib/designer/animation-engine";
import {
  computePlaybackProgress,
  firstAnimatableFrameIndex,
  playbackCursorFromTimeMs,
  playbackTimeMsFromProgress,
  type PlaybackCursor,
} from "@/lib/designer/animation-playback-timeline";
import {
  ANIM_FRAME_TRANSITION_MS,
  frameActionStepDurationMs,
  resolvePlaybackSpeed,
  animEaseInOut,
} from "@/lib/designer/animation-timing";
import {
  DESIGNER_EXPORT_START_EVENT,
  samplePlayAnimationAt,
} from "@/lib/designer/animation-export";
import { useDesignerStore } from "@/stores/designer-store";

export function useFrameAnimationPlayback() {
  const play = useDesignerStore((s) => s.play);
  const frameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const setAnimRuntime = useDesignerStore((s) => s.setAnimRuntime);
  const selectAction = useDesignerStore((s) => s.selectAction);
  const nextFrame = useDesignerStore((s) => s.nextFrame);
  const selectFrame = useDesignerStore((s) => s.selectFrame);

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const phaseRef = useRef<PlaybackCursor["phase"]>("action");
  const tickRef = useRef<(now: number) => void>(() => {});
  const playbackAdvancingRef = useRef(false);
  const scrubbingRef = useRef(false);
  const frameIndexInitializedRef = useRef(false);
  const pausedElapsedRef = useRef(0);

  const frame = play.frames[frameIndex];
  const steps = useMemo(
    () => (frame ? buildAnimationSteps(frame) : []),
    [frame],
  );

  const canPlay = firstAnimatableFrameIndex(play) >= 0;
  const phaseLabel = frame?.name?.trim() || `Frame ${frameIndex + 1}`;

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
    setPaused(false);
    setStepIndex(0);
    setProgress(0);
    phaseRef.current = "action";
    pausedElapsedRef.current = 0;
    setAnimRuntime(null);
    selectAction(null);
  }, [selectAction, setAnimRuntime]);

  const updateProgress = useCallback(
    (cursor: PlaybackCursor) => {
      setProgress(computePlaybackProgress(play, cursor));
    },
    [play],
  );

  const tick = useCallback(
    (now: number) => {
      const state = useDesignerStore.getState();
      const currentPlay = state.play;
      const fi = state.currentFrameIndex;
      const currentFrame = currentPlay.frames[fi];
      if (!currentFrame) {
        stop();
        return;
      }

      const currentSteps = buildAnimationSteps(currentFrame);
      const speed = resolvePlaybackSpeed(currentPlay.animSpeed);
      const elapsed = now - startRef.current + pausedElapsedRef.current;

      if (phaseRef.current === "action") {
        const stepMs = frameActionStepDurationMs(currentFrame, currentSteps.length, speed);
        const local = Math.min(1, elapsed / stepMs);
        const eased = animEaseInOut(local);
        const stateSnapshot = computeAnimStepStateAtEased(
          currentFrame,
          stepIndex,
          eased,
          currentPlay.courtType,
        );

        setAnimRuntime({
          active: true,
          objects: stateSnapshot.objects,
          activeActionId: stateSnapshot.activeActionId,
          activeActionIds: stateSnapshot.activeActionIds,
          revealedActionIds: stateSnapshot.revealedActionIds,
          lineProgress: stateSnapshot.lineProgress,
          showActiveLine: stateSnapshot.showActiveLine,
        });
        selectAction(stateSnapshot.activeActionId);
        updateProgress({
          frameIndex: fi,
          stepIndex,
          phase: "action",
          elapsedMs: elapsed,
        });

        if (local >= 1) {
          const next = stepIndex + 1;
          if (next < currentSteps.length) {
            setStepIndex(next);
            startRef.current = now;
            pausedElapsedRef.current = 0;
            rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
            return;
          }

          if (fi < currentPlay.frames.length - 1) {
            phaseRef.current = "transition";
            startRef.current = now;
            pausedElapsedRef.current = 0;
            rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
            return;
          }

          stop();
          return;
        }
      } else if (phaseRef.current === "transition") {
        const nextFrameData = currentPlay.frames[fi + 1];
        const transitioned = applyActionResultsToFrame(currentFrame, nextFrameData, {
          clearActions: false,
        });
        const fromObjs = computeAnimStepState(
          currentFrame,
          currentSteps.length,
          1,
          1,
          currentPlay.courtType,
        ).objects;
        const transitionMs = ANIM_FRAME_TRANSITION_MS;
        const t = Math.min(1, elapsed / transitionMs);
        const eased = animEaseInOut(t);
        const objects = lerpObjects(fromObjs, transitioned.objects, eased);

        setAnimRuntime({
          active: true,
          objects,
          activeActionId: null,
          revealedActionIds: [],
          lineProgress: 1,
        });
        updateProgress({
          frameIndex: fi,
          stepIndex,
          phase: "transition",
          elapsedMs: elapsed,
        });

        if (t >= 1) {
          phaseRef.current = "inter-frame-pause";
          startRef.current = now;
          pausedElapsedRef.current = 0;
          rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
          return;
        }
      } else {
        const pauseMs = currentPlay.animPauseMs ?? 800;
        const t = Math.min(1, elapsed / pauseMs);
        const nextFrameData = currentPlay.frames[fi + 1];
        const holdState = nextFrameData
          ? computeAnimStepState(nextFrameData, 0, 0, 0, currentPlay.courtType)
          : null;

        if (holdState) {
          setAnimRuntime({
            active: true,
            objects: holdState.objects,
            activeActionId: null,
            revealedActionIds: [],
            lineProgress: 0,
          });
        }
        updateProgress({
          frameIndex: fi,
          stepIndex: 0,
          phase: "inter-frame-pause",
          elapsedMs: elapsed,
        });

        if (t >= 1) {
          playbackAdvancingRef.current = true;
          nextFrame();
          setStepIndex(0);
          phaseRef.current = "action";
          startRef.current = now;
          pausedElapsedRef.current = 0;
          rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
          return;
        }
      }

      rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
    },
    [nextFrame, selectAction, setAnimRuntime, stepIndex, stop, updateProgress],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const seekToProgress = useCallback(
    (ratio: number) => {
      const state = useDesignerStore.getState();
      const currentPlay = state.play;
      const clamped = Math.min(1, Math.max(0, ratio));
      const timeMs = playbackTimeMsFromProgress(currentPlay, clamped);
      const resolved = playbackCursorFromTimeMs(currentPlay, timeMs);
      const sample = samplePlayAnimationAt(currentPlay, timeMs);
      if (!resolved || !sample) return;

      scrubbingRef.current = true;
      state.selectFrame(sample.frameIndex);
      setStepIndex(resolved.cursor.stepIndex);
      phaseRef.current = resolved.cursor.phase;
      pausedElapsedRef.current = resolved.cursor.elapsedMs;
      startRef.current = performance.now();
      setProgress(clamped);
      setAnimRuntime({
        active: true,
        objects: sample.runtime.objects,
        activeActionId: sample.runtime.activeActionId,
        activeActionIds: sample.runtime.activeActionIds,
        revealedActionIds: sample.runtime.revealedActionIds,
        lineProgress: sample.runtime.lineProgress,
        showActiveLine: sample.runtime.showActiveLine,
      });
      selectAction(sample.runtime.activeActionId);
      scrubbingRef.current = false;
    },
    [selectAction, setAnimRuntime],
  );

  const beginPlayback = useCallback(() => {
    const state = useDesignerStore.getState();
    const fi = state.currentFrameIndex;
    const currentFrame = state.play.frames[fi];
    if (!currentFrame || buildAnimationSteps(currentFrame).length === 0) return;

    setPlaying(true);
    setPaused(false);
    setStepIndex(0);
    phaseRef.current = "action";
    pausedElapsedRef.current = 0;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
  }, []);

  const start = useCallback(() => {
    stop();
    beginPlayback();
  }, [beginPlayback, stop]);

  const startFullPlay = useCallback(() => {
    stop();
    const state = useDesignerStore.getState();
    const first = firstAnimatableFrameIndex(state.play);
    if (first < 0) return;
    state.selectFrame(first);
    requestAnimationFrame(() => beginPlayback());
  }, [beginPlayback, stop]);

  const pause = useCallback(() => {
    if (!playing || paused) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    pausedElapsedRef.current += performance.now() - startRef.current;
    setPaused(true);
    setPlaying(false);
  }, [paused, playing]);

  const resume = useCallback(() => {
    if (!paused) return;
    setPaused(false);
    setPlaying(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
  }, [paused]);

  const togglePlayPause = useCallback(() => {
    if (playing) {
      pause();
      return;
    }
    if (paused) {
      resume();
      return;
    }
    startFullPlay();
  }, [pause, paused, playing, resume, startFullPlay]);

  const stepOnce = useCallback(() => {
    stop();
    if (!frame || !steps.length) return;
    const next = (stepIndex + 1) % steps.length;
    const stateSnapshot = computeAnimStepState(frame, next, 1, 1, play.courtType);
    setStepIndex(next);
    setAnimRuntime({
      active: true,
      objects: stateSnapshot.objects,
      activeActionId: stateSnapshot.activeActionId,
      activeActionIds: stateSnapshot.activeActionIds,
      revealedActionIds: stateSnapshot.revealedActionIds,
      lineProgress: 1,
      showActiveLine: true,
    });
    selectAction(stateSnapshot.activeActionId);
  }, [frame, play.courtType, selectAction, setAnimRuntime, stepIndex, steps.length, stop]);

  useEffect(() => {
    if (!frameIndexInitializedRef.current) {
      frameIndexInitializedRef.current = true;
      return;
    }
    if (playbackAdvancingRef.current) {
      playbackAdvancingRef.current = false;
      return;
    }
    if (scrubbingRef.current) return;
    if (playing || paused) return;
    stop();
  }, [frameIndex, paused, playing, stop]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const onExportStart = () => stop();
    window.addEventListener(DESIGNER_EXPORT_START_EVENT, onExportStart);
    return () =>
      window.removeEventListener(DESIGNER_EXPORT_START_EVENT, onExportStart);
  }, [stop]);

  return {
    playing,
    paused,
    progress,
    phaseLabel,
    canPlay,
    stepIndex,
    actionCount: steps.length,
    start,
    startFullPlay,
    stop,
    pause,
    resume,
    togglePlayPause,
    stepOnce,
    seekToProgress,
    restartFromFrame: () => selectFrame(frameIndex),
  };
}
