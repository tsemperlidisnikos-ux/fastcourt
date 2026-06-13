"use client";

import { useCallback, useEffect, useState } from "react";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import type { StoredPlay } from "@/types/library";
import "@/styles/fc-presentation.css";

interface Props {
  play: StoredPlay;
  onClose: () => void;
}

export function PresentationOverlay({ play, onClose }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const frame = play.frames[frameIndex];

  const goPrev = useCallback(() => {
    setFrameIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setFrameIndex((i) => Math.min(play.frames.length - 1, i + 1));
  }, [play.frames.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    if (!autoplay) return;
    const pause = play.animPauseMs ?? 800;
    const t = setInterval(() => {
      setFrameIndex((i) => {
        if (i >= play.frames.length - 1) {
          setAutoplay(false);
          return i;
        }
        return i + 1;
      });
    }, pause);
    return () => clearInterval(t);
  }, [autoplay, play.animPauseMs, play.frames.length]);

  useEffect(() => {
    let startX = 0;
    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0]?.clientX ?? 0;
    }
    function onTouchEnd(e: TouchEvent) {
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
  }, [goNext, goPrev]);

  if (!frame) return null;

  return (
    <div className="fc-presentation-overlay" id="presentation-overlay">
      <header className="fc-pres-header" id="pres-header">
        <div className="fc-pres-header-title">
          <h2 id="pres-play-name">{play.title}</h2>
          <span id="pres-frame-counter">
            Frame {frameIndex + 1} / {play.frames.length}
          </span>
        </div>
        <div className="fc-pres-header-actions pres-header-actions">
          <button type="button" className="fc-pres-btn" id="pres-close" onClick={onClose}>
            Close
          </button>
        </div>
      </header>

      <div className="fc-pres-court-area" id="pres-court-area">
        <CourtFrameThumbnail
          courtType={play.courtType}
          frame={frame}
          size="sm"
          alt={frame.name}
        />
      </div>

      {frame.notes ? (
        <aside className="fc-pres-notes-bar pres-notes-bar" id="pres-notes-bar">
          <div
            className="fc-pres-notes-body pres-notes-body"
            id="pres-notes-text"
            dangerouslySetInnerHTML={{ __html: frame.notes }}
          />
        </aside>
      ) : null}

      <footer className="fc-pres-controls" id="pres-controls">
        <button type="button" className="fc-pres-nav-btn" id="pres-prev" onClick={goPrev} disabled={frameIndex <= 0}>
          ‹ Prev
        </button>
        <button
          type="button"
          className="fc-pres-nav-btn"
          id="pres-play-seq"
          onClick={() => setAutoplay((v) => !v)}
        >
          {autoplay ? "Pause" : "Autoplay"}
        </button>
        <button
          type="button"
          className="fc-pres-nav-btn"
          id="pres-next"
          onClick={goNext}
          disabled={frameIndex >= play.frames.length - 1}
        >
          Next ›
        </button>
      </footer>

      <p className="fc-pres-swipe-hint pres-swipe-hint" id="pres-swipe-hint">
        Swipe or use arrow keys to change frames
      </p>
    </div>
  );
}
