"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { PlayAnimationCourtView } from "@/components/library/PlayAnimationCourtView";
import { useClientMounted } from "@/hooks/useClientMounted";
import { usePlayAnimationDriver } from "@/hooks/usePlayAnimationDriver";
import { buildDesignerHref } from "@/lib/designer/designer-deep-link";
import { framesForDesignerThumbnails } from "@/lib/designer/thumbnail-objects";
import { gamePlanCategoryLabel } from "@/lib/game-plan/constants";
import { timeoutCueCoverageLabel } from "@/lib/game-plan/game-day-timeout-cues";
import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import {
  DEFAULT_TIMEOUT_SECONDS,
  type TimeoutReadSlide,
  type TimeoutSlide,
  type TimeoutViewSlide,
} from "@/lib/game-plan/timeout-mode";
import {
  formatReadSuccessBadge,
  lookupCounterSuccessPct,
  lookupReadSuccessPct,
  type ReadSuccessLookup,
} from "@/lib/practice/read-success-by-call";
import type { GamePlanTimeoutCue } from "@/types/library-meta";
import "@/styles/fc-timeout-mode.css";

interface Props {
  slides: TimeoutViewSlide[];
  onClose: () => void;
  countdownSeconds?: number;
  title?: string;
  readSuccessLookup?: ReadSuccessLookup;
}

function CounterTimeoutView({
  cue,
  countdownSeconds,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  slideIndex,
  slideCount,
  readSuccessLookup,
}: {
  cue: GamePlanTimeoutCue;
  countdownSeconds: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  slideIndex: number;
  slideCount: number;
  readSuccessLookup?: ReadSuccessLookup;
}) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const successPct = readSuccessLookup
    ? lookupCounterSuccessPct(
        readSuccessLookup,
        cue.title,
        cue.defensePlayId,
      )
    : null;
  const successBadge = formatReadSuccessBadge(successPct);

  useEffect(() => {
    setSecondsLeft(countdownSeconds);
  }, [countdownSeconds, cue.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cue.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNext, hasPrev, onClose, onNext, onPrev]);

  return (
    <div className="fc-timeout-overlay fc-timeout-overlay-counter" id="timeout-overlay">
      <header className="fc-timeout-header">
        <div className="fc-timeout-call-block">
          <span className="fc-timeout-category">Counter call</span>
          <span className="fc-timeout-counter-coverage">
            {timeoutCueCoverageLabel(cue.coverage)}
          </span>
          {cue.targetsPattern ? (
            <span className="fc-timeout-counter-pattern">vs {cue.targetsPattern}</span>
          ) : null}
          <h1 className="fc-timeout-call">{cue.title}</h1>
          {successBadge ? (
            <p className="fc-timeout-read-success">{successBadge}</p>
          ) : null}
          <p className="fc-timeout-counter-detail">{cue.detail}</p>
        </div>
        <div className="fc-timeout-header-meta">
          <span
            className={`fc-timeout-clock${secondsLeft <= 8 ? " is-urgent" : ""}`}
            aria-live="polite"
          >
            {secondsLeft}s
          </span>
          <span className="fc-timeout-slide-count">
            {slideIndex + 1} / {slideCount}
          </span>
          <button type="button" className="fc-timeout-close" onClick={onClose}>
            ✕
          </button>
        </div>
      </header>

      <div className="fc-timeout-counter-body">
          {cue.weakPoint ? (
            <p className="fc-timeout-counter-line">
              <strong>They want</strong> {cue.weakPoint}
            </p>
          ) : null}
          {cue.sourceFilmSessionId ? (
            <p className="fc-timeout-counter-film">
              <Link
                className="fc-timeout-counter-film-link"
                href={buildFilmRoomDeepLink(
                  cue.sourceFilmSessionId,
                  cue.sourceFilmTimestamp,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch scout clip ↗
              </Link>
            </p>
          ) : null}
          {cue.defensePlayId ? (
            <p className="fc-timeout-counter-film">
              <Link
                className="fc-timeout-counter-film-link"
                href={`/designer?item=${encodeURIComponent(cue.defensePlayId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open defense play ↗
              </Link>
            </p>
          ) : null}
        {cue.trigger ? (
          <p className="fc-timeout-counter-line">
            <strong>Trigger</strong> {cue.trigger}
          </p>
        ) : null}
        {cue.ballHandlerRule ? (
          <p className="fc-timeout-counter-line fc-timeout-counter-rule">
            <strong>BH</strong> {cue.ballHandlerRule}
          </p>
        ) : null}
        {cue.screenerRule ? (
          <p className="fc-timeout-counter-line fc-timeout-counter-rule">
            <strong>Big</strong> {cue.screenerRule}
          </p>
        ) : null}
      </div>

      <footer className="fc-timeout-footer">
        <button type="button" className="fc-timeout-nav" disabled={!hasPrev} onClick={onPrev}>
          ‹ Prev
        </button>
        <button type="button" className="fc-timeout-nav" disabled={!hasNext} onClick={onNext}>
          Next ›
        </button>
      </footer>
    </div>
  );
}

function ReadTimeoutView({
  read,
  countdownSeconds,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  slideIndex,
  slideCount,
  readSuccessLookup,
}: {
  read: TimeoutReadSlide;
  countdownSeconds: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  slideIndex: number;
  slideCount: number;
  readSuccessLookup?: ReadSuccessLookup;
}) {
  const chainFrames = useMemo(
    () => framesForDesignerThumbnails(read.play.frames),
    [read.play.frames],
  );
  const displayFrame =
    chainFrames[read.frameIndex] ?? chainFrames[0] ?? read.play.frames[read.frameIndex];
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const filmHref =
    read.filmSessionId != null
      ? buildFilmRoomDeepLink(read.filmSessionId, read.filmTimestamp)
      : null;
  const successPct = readSuccessLookup
    ? lookupReadSuccessPct(readSuccessLookup, read.callLabel, read.play.id)
    : null;
  const successBadge = formatReadSuccessBadge(successPct);

  useEffect(() => {
    setSecondsLeft(countdownSeconds);
  }, [countdownSeconds, read.play.id, read.frameIndex]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [read.play.id, read.frameIndex]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNext, hasPrev, onClose, onNext, onPrev]);

  if (!displayFrame) return null;

  return (
    <div className="fc-timeout-overlay fc-timeout-overlay-read" id="timeout-overlay">
      <header className="fc-timeout-header">
        <div className="fc-timeout-call-block">
          <span className="fc-timeout-category fc-timeout-category-read">Offense read</span>
          <h1 className="fc-timeout-call">{read.callLabel}</h1>
          {successBadge ? (
            <p className="fc-timeout-read-success">{successBadge}</p>
          ) : null}
          <p className="fc-timeout-play-title">{read.play.title}</p>
          {read.detail ? (
            <p className="fc-timeout-read-detail">{read.detail}</p>
          ) : null}
        </div>
        <div className="fc-timeout-header-meta">
          <span
            className={`fc-timeout-clock${secondsLeft <= 8 ? " is-urgent" : ""}`}
            aria-live="polite"
          >
            {secondsLeft}s
          </span>
          <span className="fc-timeout-slide-count">
            {slideIndex + 1} / {slideCount}
          </span>
          <button type="button" className="fc-timeout-close" onClick={onClose}>
            ✕
          </button>
        </div>
      </header>

      <div className="fc-timeout-court">
        <PlayAnimationCourtView
          courtType={read.play.courtType}
          frame={displayFrame}
          runtime={null}
          courtView={read.play.courtView}
          presentation
        />
      </div>

      <div className="fc-timeout-read-links">
        <Link
          className="fc-timeout-read-link"
          href={buildDesignerHref(read.play.id, read.frameIndex)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Designer frame ↗
        </Link>
        {filmHref ? (
          <Link
            className="fc-timeout-read-link is-film"
            href={filmHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch film ↗
          </Link>
        ) : null}
      </div>

      <footer className="fc-timeout-footer">
        <button type="button" className="fc-timeout-nav" disabled={!hasPrev} onClick={onPrev}>
          ‹ Prev
        </button>
        <button type="button" className="fc-timeout-nav" disabled={!hasNext} onClick={onNext}>
          Next ›
        </button>
      </footer>
    </div>
  );
}

function PlayTimeoutSlideView({
  slide,
  countdownSeconds,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  slideIndex,
  slideCount,
}: {
  slide: TimeoutSlide;
  countdownSeconds: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  slideIndex: number;
  slideCount: number;
}) {
  const animation = usePlayAnimationDriver(slide.play, {
    simulateGuardRotation: true,
  });
  const chainFrames = useMemo(
    () => framesForDesignerThumbnails(slide.play.frames),
    [slide.play.frames],
  );
  const displayFrameIndex = animation.sample?.frameIndex ?? 0;
  const sourceFrame = slide.play.frames[displayFrameIndex] ?? slide.play.frames[0];
  const chainFrame = chainFrames[displayFrameIndex] ?? chainFrames[0];
  const displayFrame = animation.playing ? sourceFrame : chainFrame;
  const animRuntime = animation.playing ? (animation.sample?.runtime ?? null) : null;

  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);

  useEffect(() => {
    setSecondsLeft(countdownSeconds);
  }, [countdownSeconds, slide.play.id]);

  useEffect(() => {
    if (animation.canPlay) animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart animation per slide
  }, [slide.play.id]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [slide.play.id]);

  const stopAnimation = useCallback(() => {
    animation.stop();
  }, [animation]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        onPrev();
        return;
      }
      if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        onNext();
        return;
      }
      if (e.key === " " && animation.canPlay) {
        e.preventDefault();
        if (animation.playing) stopAnimation();
        else animation.start();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    animation,
    hasNext,
    hasPrev,
    onClose,
    onNext,
    onPrev,
    stopAnimation,
  ]);

  if (!sourceFrame || !displayFrame) return null;

  return (
    <div className="fc-timeout-overlay" id="timeout-overlay">
      <header className="fc-timeout-header">
        <div className="fc-timeout-call-block">
          <span className="fc-timeout-category">
            {gamePlanCategoryLabel(slide.categoryId)}
          </span>
          <h1 className="fc-timeout-call">{slide.callLabel}</h1>
          <p className="fc-timeout-play-title">{slide.play.title}</p>
        </div>
        <div className="fc-timeout-header-meta">
          <span
            className={`fc-timeout-clock${secondsLeft <= 8 ? " is-urgent" : ""}`}
            aria-live="polite"
          >
            {secondsLeft}s
          </span>
          <span className="fc-timeout-slide-count">
            {slideIndex + 1} / {slideCount}
          </span>
          <button type="button" className="fc-timeout-close" onClick={onClose}>
            ✕
          </button>
        </div>
      </header>

      <div className="fc-timeout-court">
        <PlayAnimationCourtView
          courtType={slide.play.courtType}
          frame={displayFrame}
          runtime={animRuntime}
          courtView={slide.play.courtView}
          presentation
        />
      </div>

      <footer className="fc-timeout-footer">
        <button
          type="button"
          className="fc-timeout-nav"
          disabled={!hasPrev}
          onClick={onPrev}
        >
          ‹ Prev call
        </button>
        {animation.canPlay ? (
          <button
            type="button"
            className="fc-timeout-nav fc-timeout-replay"
            onClick={() => {
              if (animation.playing) stopAnimation();
              else animation.start();
            }}
          >
            {animation.playing ? "Pause" : "Replay"}
          </button>
        ) : null}
        <button
          type="button"
          className="fc-timeout-nav"
          disabled={!hasNext}
          onClick={onNext}
        >
          Next call ›
        </button>
      </footer>
    </div>
  );
}

export function TimeoutOverlay({
  slides,
  onClose,
  countdownSeconds = DEFAULT_TIMEOUT_SECONDS,
  title,
  readSuccessLookup,
}: Props) {
  const mounted = useClientMounted();
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  if (!mounted || !slide || slides.length === 0) return null;

  const common = {
    countdownSeconds,
    onClose,
    onPrev: () => setIndex((value) => Math.max(0, value - 1)),
    onNext: () => setIndex((value) => Math.min(slides.length - 1, value + 1)),
    hasPrev: index > 0,
    hasNext: index < slides.length - 1,
    slideIndex: index,
    slideCount: slides.length,
  };

  return createPortal(
    <>
      {title ? <span className="visually-hidden">{title}</span> : null}
      {slide.kind === "counter" ? (
        <CounterTimeoutView
          key={slide.cue.id + index}
          cue={slide.cue}
          readSuccessLookup={readSuccessLookup}
          {...common}
        />
      ) : slide.kind === "read" ? (
        <ReadTimeoutView
          key={`${slide.read.play.id}-${slide.read.frameIndex}-${index}`}
          read={slide.read}
          readSuccessLookup={readSuccessLookup}
          {...common}
        />
      ) : (
        <PlayTimeoutSlideView
          key={slide.slide.play.id + index}
          slide={slide.slide}
          {...common}
        />
      )}
    </>,
    document.body,
  );
}

/** @deprecated Use TimeoutViewSlide[] — kept for direct play-only callers. */
export function timeoutSlidesFromPlays(slides: TimeoutSlide[]): TimeoutViewSlide[] {
  return slides.map((slide) => ({ kind: "play", slide }));
}
