"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAnimationExportDurationMs,
  playHasExportableAnimation,
  samplePlayAnimationAt,
  type AnimationExportSample,
} from "@/lib/designer/animation-export";
import type { PlayDocument } from "@/types/designer";

export function usePlayAnimationDriver(play: PlayDocument) {
  const [playing, setPlaying] = useState(false);
  const [sample, setSample] = useState<AnimationExportSample | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const tickRef = useRef<(now: number) => void>(() => {});

  const durationMs = useMemo(() => getAnimationExportDurationMs(play), [play]);
  const canPlay = useMemo(() => playHasExportableAnimation(play), [play]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cancelRaf();
    setPlaying(false);
    setSample(null);
  }, [cancelRaf]);

  const clearSample = useCallback(() => {
    setSample(null);
  }, []);

  const tick = useCallback(
    (now: number) => {
      const elapsed = now - startRef.current;
      if (elapsed >= durationMs) {
        const end = samplePlayAnimationAt(play, Math.max(0, durationMs - 1));
        setSample(end);
        setPlaying(false);
        cancelRaf();
        return;
      }

      setSample(samplePlayAnimationAt(play, elapsed));
      rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
    },
    [cancelRaf, durationMs, play],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const start = useCallback(() => {
    cancelRaf();
    if (!canPlay) return;
    const initial = samplePlayAnimationAt(play, 0);
    setSample(initial);
    setPlaying(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame((t) => tickRef.current(t));
  }, [canPlay, cancelRaf, play]);

  useEffect(() => () => stop(), [stop]);

  return {
    playing,
    sample,
    canPlay,
    start,
    stop,
    clearSample,
  };
}
