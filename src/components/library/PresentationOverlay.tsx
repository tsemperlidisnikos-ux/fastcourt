"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayAnimationCourtView } from "@/components/library/PlayAnimationCourtView";
import { VideoWatchButton } from "@/components/library/VideoWatchButton";
import { usePlayAnimationDriver } from "@/hooks/usePlayAnimationDriver";
import { framesForDesignerThumbnails } from "@/lib/designer/thumbnail-objects";
import type { StoredPlay } from "@/types/library";
import "@/styles/fc-presentation.css";

interface Props {
  play: StoredPlay;
  onClose: () => void;
}

export function PresentationOverlay({ play, onClose }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const animation = usePlayAnimationDriver(play);

  const chainFrames = useMemo(
    () => framesForDesignerThumbnails(play.frames),
    [play.frames],
  );

  const isAnimating = animation.playing;
  const displayFrameIndex = animation.sample?.frameIndex ?? frameIndex;
  const sourceFrame = play.frames[displayFrameIndex] ?? play.frames[0];
  const chainFrame = chainFrames[displayFrameIndex] ?? chainFrames[0];
  const displayFrame = isAnimating ? sourceFrame : chainFrame;
  const animRuntime = isAnimating ? (animation.sample?.runtime ?? null) : null;

  const goPrev = useCallback(() => {
    if (animation.playing) return;
    animation.clearSample();
    setFrameIndex((i) => Math.max(0, i - 1));
  }, [animation]);

  const goNext = useCallback(() => {
    if (animation.playing) return;
    animation.clearSample();
    setFrameIndex((i) => Math.min(play.frames.length - 1, i + 1));
  }, [animation, play.frames.length]);

  const stopAnimation = useCallback(() => {
    const idx = animation.sample?.frameIndex;
    if (idx != null) setFrameIndex(idx);
    animation.stop();
  }, [animation]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (animation.playing) stopAnimation();
        else onClose();
        return;
      }
      if (e.key === " " && animation.canPlay) {
        e.preventDefault();
        if (animation.playing) stopAnimation();
        else animation.start();
        return;
      }
      if (animation.playing) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [animation, goNext, goPrev, onClose, stopAnimation]);

  useEffect(() => {
    let startX = 0;
    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0]?.clientX ?? 0;
    }
    function onTouchEnd(e: TouchEvent) {
      if (animation.playing) return;
      const endX = e.changedTouches[0]?.clientX ?? 0;
      const dx = endX - startX;
      if (Math.abs(dx) < 48) return;
      if (dx < 0) goNext();
      else goPrev();
    }
    const el = document.getElementById("presentation-overlay");
    el?.addEventListener("touchstart", onTouchStart, { passive: true });
    el?.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el?.removeEventListener("touchstart", onTouchStart);
      el?.removeEventListener("touchend", onTouchEnd);
    };
  }, [animation.playing, goNext, goPrev]);

  if (!sourceFrame || !displayFrame) return null;

  const notesFrame = chainFrames[displayFrameIndex] ?? displayFrame;

  return (
    <div className="fc-presentation-overlay" id="presentation-overlay">
      <header className="fc-pres-header" id="pres-header">
        <div className="fc-pres-header-title">
          <h2 id="pres-play-name">{play.title}</h2>
          <span id="pres-frame-counter">
            Frame {displayFrameIndex + 1} / {play.frames.length}
          </span>
        </div>
        <div className="fc-pres-header-actions pres-header-actions">
          {play.videoUrl ? (
            <VideoWatchButton
              videoUrl={play.videoUrl}
              title={play.title}
              className="fc-pres-btn fc-pres-video-btn"
              id="pres-video-btn"
              label="▶ Video"
            />
          ) : null}
          <button type="button" className="fc-pres-btn" id="pres-close" onClick={onClose}>
            Close
          </button>
        </div>
      </header>

      <div className="fc-pres-court-area" id="pres-court-area">
        <PlayAnimationCourtView
          courtType={play.courtType}
          frame={displayFrame}
          runtime={animRuntime}
          courtView={play.courtView}
          presentation
        />
      </div>

      {notesFrame.notes ? (
        <aside className="fc-pres-notes-bar pres-notes-bar" id="pres-notes-bar">
          <div
            className="fc-pres-notes-body pres-notes-body"
            id="pres-notes-text"
            dangerouslySetInnerHTML={{ __html: notesFrame.notes }}
          />
        </aside>
      ) : null}

      <footer className="fc-pres-controls" id="pres-controls">
        <button
          type="button"
          className="fc-pres-nav-btn"
          id="pres-prev"
          onClick={goPrev}
          disabled={animation.playing || displayFrameIndex <= 0}
        >
          ‹ Prev
        </button>
        {animation.canPlay ? (
          <button
            type="button"
            className={`fc-pres-nav-btn fc-pres-play-full ${animation.playing ? "is-playing" : ""}`}
            id="pres-play-full"
            onClick={() => {
              if (animation.playing) stopAnimation();
              else animation.start();
            }}
          >
            {animation.playing ? "Stop" : "Play Full Animation"}
          </button>
        ) : null}
        <button
          type="button"
          className="fc-pres-nav-btn"
          id="pres-next"
          onClick={goNext}
          disabled={animation.playing || displayFrameIndex >= play.frames.length - 1}
        >
          Next ›
        </button>
      </footer>

      <p className="fc-pres-swipe-hint pres-swipe-hint" id="pres-swipe-hint">
        {animation.canPlay
          ? "Space to play full animation · swipe or arrows to browse frames"
          : "Swipe or use arrow keys to change frames"}
      </p>
    </div>
  );
}
