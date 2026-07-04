"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilmRoomBookmarkBar } from "@/components/film-room/FilmRoomBookmarkBar";
import { FilmRoomAnalysisHistoryPanel } from "@/components/film-room/FilmRoomAnalysisHistoryPanel";
import { FilmRoomFramePreviewStrip } from "@/components/film-room/FilmRoomFramePreviewStrip";
import { FilmRoomEventTagBar } from "@/components/film-room/FilmRoomEventTagBar";
import { FilmRoomDisruptionTagBar } from "@/components/film-room/FilmRoomDisruptionTagBar";
import { FilmRoomFloatingShuttleWheel } from "@/components/film-room/FilmRoomFloatingShuttleWheel";
import { FilmRoomAddToGamePlanModal } from "@/components/film-room/FilmRoomAddToGamePlanModal";
import { FilmRoomAnalyzeModal } from "@/components/film-room/FilmRoomAnalyzeModal";
import { FilmScoutPrintOverlay } from "@/components/film-room/FilmScoutPrintOverlay";
import { FilmRoomToolbar } from "@/components/film-room/FilmRoomToolbar";
import { FilmRoomVideoControlDock } from "@/components/film-room/FilmRoomVideoControlDock";
import {
  FilmRoomVideoSurface,
  type VideoPlaybackController,
} from "@/components/film-room/FilmRoomVideoSurface";
import { VideoAnnotationCanvas } from "@/components/film-room/VideoAnnotationCanvas";
import { filmRoomSourceLabel } from "@/lib/film-room/film-room-source";
import {
  canCaptureFilmFrames,
  capturedFramesToPreviews,
  captureFilmFramesAroundTime,
  type FilmFramePreview,
} from "@/lib/film-room/capture-film-frames";
import { FILM_CLIP_ANALYZE_FRAME_COUNT } from "@/lib/film-room/capture-video-frames";
import { buildFilmAnalyzeContext } from "@/lib/film-room/film-analyze-context";
import { createFilmAnalysisRecord } from "@/lib/film-room/film-analysis-history";
import {
  FILM_EVENT_KEYBOARD_MAP,
  selectFilmEventsForAnalyze,
} from "@/lib/film-room/film-event-tags";
import {
  FILM_DISRUPTION_KEYBOARD_MAP,
  selectFilmDisruptionsForAnalyze,
} from "@/lib/film-room/film-disruption-tags";
import type { YouTubePlayerInstance } from "@/lib/film-room/youtube-iframe-api";
import { analyzeFilmClip } from "@/lib/film-room/film-clip-analyze-client";
import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import { appNotice } from "@/stores/dialog-store";
import { withoutPenStrokesNearTime } from "@/lib/film-room/film-room-strokes";
import { clampSeekTime } from "@/lib/film-room/shuttle-wheel";
import {
  DEFAULT_FILM_ROOM_MARKUP_PRESET,
  filmRoomMarkupPreset,
  type FilmRoomMarkupPreset,
} from "@/lib/film-room/markup-toolbar-presets";
import { useAiAssistantStatus } from "@/hooks/useAiAssistantStatus";
import { buildFilmScoutPrintModelFromSession } from "@/lib/film-room/film-scout-print-model";
import { defaultFilmBookmarkLabel } from "@/lib/film-room/film-room-bookmarks";
import {
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "@/lib/settings/pdf-brand-export";
import { useFilmRoomStore } from "@/stores/film-room-store";
import { useSettingsStore } from "@/stores/settings-store";
import type {
  FilmRoomSession,
  FilmRoomEventKind,
  FilmRoomDisruptionKind,
  FilmRoomAnalysisRecord,
  VideoAnnotationStroke,
} from "@/types/film-room";
import type { FilmAnalyzeContext } from "@/lib/film-room/film-analyze-context";
import type { FilmScoutPrintModel } from "@/lib/film-room/film-scout-print-model";

interface Props {
  session: FilmRoomSession;
  initialSeekTime?: number | null;
}

export function FilmRoomAnnotator({ session, initialSeekTime = null }: Props) {
  const setStrokes = useFilmRoomStore((s) => s.setStrokes);
  const appendStroke = useFilmRoomStore((s) => s.appendStroke);
  const addFilmEvent = useFilmRoomStore((s) => s.addFilmEvent);
  const updateFilmEvent = useFilmRoomStore((s) => s.updateFilmEvent);
  const undoLastFilmEvent = useFilmRoomStore((s) => s.undoLastFilmEvent);
  const removeFilmEvent = useFilmRoomStore((s) => s.removeFilmEvent);
  const addFilmDisruption = useFilmRoomStore((s) => s.addFilmDisruption);
  const updateFilmDisruption = useFilmRoomStore((s) => s.updateFilmDisruption);
  const undoLastFilmDisruption = useFilmRoomStore((s) => s.undoLastFilmDisruption);
  const removeFilmDisruption = useFilmRoomStore((s) => s.removeFilmDisruption);
  const addFilmBookmark = useFilmRoomStore((s) => s.addFilmBookmark);
  const updateFilmBookmark = useFilmRoomStore((s) => s.updateFilmBookmark);
  const removeFilmBookmark = useFilmRoomStore((s) => s.removeFilmBookmark);
  const appendAnalysisRecord = useFilmRoomStore((s) => s.appendAnalysisRecord);
  const removeAnalysisRecord = useFilmRoomStore((s) => s.removeAnalysisRecord);
  const clearPenStrokes = useFilmRoomStore((s) => s.clearPenStrokes);
  const resolveUploadObjectUrl = useFilmRoomStore((s) => s.resolveUploadObjectUrl);
  const strokes = useFilmRoomStore(
    (s) => s.sessions.find((row) => row.id === session.id)?.strokes ?? session.strokes,
  );
  const events = useFilmRoomStore(
    (s) => s.sessions.find((row) => row.id === session.id)?.events ?? session.events ?? [],
  );
  const disruptions = useFilmRoomStore(
    (s) =>
      s.sessions.find((row) => row.id === session.id)?.disruptions ??
      session.disruptions ??
      [],
  );
  const bookmarks = useFilmRoomStore(
    (s) => s.sessions.find((row) => row.id === session.id)?.bookmarks ?? session.bookmarks ?? [],
  );
  const analyses = useFilmRoomStore(
    (s) => s.sessions.find((row) => row.id === session.id)?.analyses ?? session.analyses ?? [],
  );

  const [canvasEpoch, setCanvasEpoch] = useState(0);
  const [activePreset, setActivePreset] = useState<FilmRoomMarkupPreset>(
    DEFAULT_FILM_ROOM_MARKUP_PRESET,
  );
  const [undoStack, setUndoStack] = useState<VideoAnnotationStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<VideoAnnotationStroke[][]>([]);

  const markup = filmRoomMarkupPreset(activePreset);
  const tool = markup.tool;
  const inkColor = markup.color;
  const inkWidth = markup.width;

  const strokesRef = useRef(strokes);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
    setCanvasEpoch(0);
    setShuttlePositionKey((key) => key + 1);
    initialSeekAppliedRef.current = false;
  }, [session.id]);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<VideoPlaybackController | null>(null);

  const [uploadSrc, setUploadSrc] = useState<string | null>(null);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoClearOnScrub, setAutoClearOnScrub] = useState(false);
  const [shuttlePositionKey, setShuttlePositionKey] = useState(0);
  const [gamePlanModalOpen, setGamePlanModalOpen] = useState(false);
  const [analyzeModalOpen, setAnalyzeModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FilmClipAnalysisResult | null>(
    null,
  );
  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [analyzePhase, setAnalyzePhase] = useState<"capturing" | "analyzing" | null>(null);
  const [captureProgress, setCaptureProgress] = useState({ current: 0, total: FILM_CLIP_ANALYZE_FRAME_COUNT });
  const [analyzeContext, setAnalyzeContext] = useState<FilmAnalyzeContext | null>(null);
  const [tagNoteDraft, setTagNoteDraft] = useState("");
  const [framePreviews, setFramePreviews] = useState<FilmFramePreview[]>([]);
  const [showFramePreviews, setShowFramePreviews] = useState(false);
  const [historyPlayheadTime, setHistoryPlayheadTime] = useState<number | null>(null);
  const [scoutPrintModel, setScoutPrintModel] = useState<FilmScoutPrintModel | null>(null);
  const aiStatus = useAiAssistantStatus();
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayerInstance | null>(null);
  const youtubeCaptureRootRef = useRef<HTMLElement | null>(null);
  const initialSeekAppliedRef = useRef(false);

  useEffect(() => {
    function syncFullscreen() {
      const shell = playerShellRef.current;
      setFullscreen(!!shell && document.fullscreenElement === shell);
    }
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = playerShellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
        shell.focus({ preventScroll: true });
      }
    } catch {
      /* browser blocked or unsupported */
    }
  }, []);

  const isFilmFullscreen = useCallback(() => {
    const shell = playerShellRef.current;
    return !!shell && document.fullscreenElement === shell;
  }, []);

  const togglePlay = useCallback(() => {
    const c = controllerRef.current;
    if (!c) return;
    if (c.isPlaying()) c.pause();
    else c.play();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space" || e.key === " ") {
        if (!isFilmFullscreen()) return;
        e.preventDefault();
        e.stopPropagation();
        togglePlay();
        return;
      }

      if (e.key !== "f" && e.key !== "F") return;
      e.preventDefault();
      void toggleFullscreen();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isFilmFullscreen, toggleFullscreen, togglePlay]);

  useEffect(() => {
    if (session.source.kind !== "upload") {
      setUploadSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    void resolveUploadObjectUrl(session.source.blobId).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setUploadSrc(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [session.source, resolveUploadObjectUrl]);

  useEffect(() => {
    const node = overlayRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setOverlaySize({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const handleController = useCallback((controller: VideoPlaybackController | null) => {
    controllerRef.current = controller;
  }, []);

  const seek = useCallback((time: number) => {
    controllerRef.current?.seek(time);
    setCurrentTime(time);
  }, []);

  useEffect(() => {
    if (initialSeekAppliedRef.current) return;
    if (initialSeekTime == null || !Number.isFinite(initialSeekTime)) return;
    if (duration <= 0 || !controllerRef.current) return;
    initialSeekAppliedRef.current = true;
    const next = clampSeekTime(initialSeekTime, duration);
    seek(next);
  }, [duration, initialSeekTime, seek]);

  const recordUndo = useCallback(() => {
    setUndoStack((stack) => [...stack, strokesRef.current]);
    setRedoStack([]);
  }, []);

  const handleJogStart = useCallback(() => {
    const controller = controllerRef.current;
    controller?.pause();
    const anchorTime = controller?.getCurrentTime() ?? currentTime;
    if (!autoClearOnScrub) return;
    const next = withoutPenStrokesNearTime(strokesRef.current, anchorTime);
    if (next.length === strokesRef.current.length) return;
    recordUndo();
    setStrokes(session.id, next);
    setCanvasEpoch((epoch) => epoch + 1);
  }, [autoClearOnScrub, currentTime, recordUndo, session.id, setStrokes]);

  const handleJog = useCallback(
    (deltaSeconds: number) => {
      const controller = controllerRef.current;
      const now = controller?.getCurrentTime() ?? currentTime;
      const dur = controller?.getDuration() ?? duration;
      const next = clampSeekTime(now + deltaSeconds, dur);
      controller?.seek(next);
      setCurrentTime(next);
    },
    [currentTime, duration],
  );

  const handleSliderSeek = useCallback(
    (time: number) => {
      if (autoClearOnScrub) {
        const next = withoutPenStrokesNearTime(strokesRef.current, time);
        if (next.length !== strokesRef.current.length) {
          recordUndo();
          setStrokes(session.id, next);
          setCanvasEpoch((epoch) => epoch + 1);
        }
      }
      seek(time);
    },
    [autoClearOnScrub, recordUndo, seek, session.id, setStrokes],
  );

  const applyStrokes = useCallback(
    (nextStrokes: VideoAnnotationStroke[]) => {
      setStrokes(session.id, nextStrokes);
      setCanvasEpoch((epoch) => epoch + 1);
    },
    [session.id, setStrokes],
  );

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setRedoStack((redo) => [...redo, strokesRef.current]);
      applyStrokes(previous);
      return stack.slice(0, -1);
    });
  }, [applyStrokes]);

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setUndoStack((undo) => [...undo, strokesRef.current]);
      applyStrokes(next);
      return stack.slice(0, -1);
    });
  }, [applyStrokes]);

  const clearPenDrawings = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    recordUndo();
    clearPenStrokes(session.id);
    setCanvasEpoch((epoch) => epoch + 1);
  }, [clearPenStrokes, recordUndo, session.id]);

  const handleStrokesChange = useCallback(
    (nextStrokes: typeof strokes) => {
      setStrokes(session.id, nextStrokes);
    },
    [session.id, setStrokes],
  );

  const handleStrokeComplete = useCallback(
    (stroke: VideoAnnotationStroke) => {
      recordUndo();
      appendStroke(session.id, stroke);
    },
    [appendStroke, recordUndo, session.id],
  );

  const handleEraserGestureStart = useCallback(() => {
    recordUndo();
  }, [recordUndo]);

  const markerTimes = Array.from(
    new Set(strokes.map((stroke) => stroke.time)),
  ).sort((a, b) => a - b);

  const eventMarkerTimes = events.map((event) => ({ id: event.id, time: event.time }));
  const disruptionMarkerTimes = disruptions.map((row) => ({
    id: row.id,
    time: row.time,
  }));
  const bookmarkMarkerTimes = bookmarks.map((bookmark) => ({
    id: bookmark.id,
    time: bookmark.time,
    kind: bookmark.kind ?? "chapter",
  }));

  const handleTagAtPlayhead = useCallback(
    (kind: FilmRoomEventKind, note?: string) => {
      if (duration <= 0) return;
      addFilmEvent(session.id, kind, currentTime, note);
    },
    [addFilmEvent, currentTime, duration, session.id],
  );

  const handleDisruptionAtPlayhead = useCallback(
    (kind: FilmRoomDisruptionKind, note?: string) => {
      if (duration <= 0) return;
      addFilmDisruption(session.id, kind, currentTime, note);
    },
    [addFilmDisruption, currentTime, duration, session.id],
  );

  const handleAddBookmark = useCallback(
    (label: string, note?: string, kind?: import("@/types/film-room").FilmRoomBookmarkKind) => {
      if (duration <= 0) return;
      addFilmBookmark(session.id, currentTime, label, note, kind);
    },
    [addFilmBookmark, currentTime, duration, session.id],
  );

  const openAnalysisRecord = useCallback((record: FilmRoomAnalysisRecord) => {
    setAnalysisResult(record.result);
    setHistoryPlayheadTime(record.playheadTime);
    setAnalyzeContext(
      buildFilmAnalyzeContext(
        record.coachTags.map((tag) => ({
          id: `hist_${tag.time}_${tag.kind}`,
          kind: tag.kind,
          time: tag.time,
          note: tag.note,
          createdAt: record.createdAt,
        })),
        Array.from({ length: record.frameCount }, (_, index) =>
          record.playheadTime - 1 + (index / Math.max(1, record.frameCount - 1)) * 2,
        ),
        (record.disruptionTags ?? []).map((tag) => ({
          id: `hist_${tag.time}_${tag.kind}`,
          kind: tag.kind,
          time: tag.time,
          note: tag.note,
          createdAt: record.createdAt,
        })),
      ),
    );
    setAnalyzeModalOpen(true);
  }, []);

  const exportSessionScoutPdf = useCallback(() => {
    const model = buildFilmScoutPrintModelFromSession({
      session: {
        ...session,
        events,
        bookmarks,
        analyses,
      },
      origin: window.location.origin,
      teamName: resolvePdfCoverTeam(pdfBrand),
      footerText: resolvePdfFooterText(pdfBrand),
    });
    if (model) setScoutPrintModel(model);
  }, [analyses, bookmarks, events, pdfBrand, session]);

  const canAnalyzeClip = canCaptureFilmFrames(session.source);

  async function handleAnalyzeClip() {
    if (!canAnalyzeClip || analyzeBusy) return;
    if (aiStatus.configured === false) {
      appNotice(
        "AI Assistant",
        "OpenAI is not configured on this server. Add OPENAI_API_KEY to .env.local (local) or Vercel Environment Variables (production), then restart.",
      );
      return;
    }
    const video = nativeVideoRef.current;
    if (session.source.kind !== "youtube" && !video) {
      appNotice("Analyze clip", "Video is not ready yet. Try again in a moment.");
      return;
    }
    if (session.source.kind === "youtube" && !youtubePlayerRef.current) {
      appNotice("Analyze clip", "YouTube player is not ready yet. Try again in a moment.");
      return;
    }

    setAnalyzeBusy(true);
    setAnalyzePhase("capturing");
    setCaptureProgress({ current: 0, total: FILM_CLIP_ANALYZE_FRAME_COUNT });
    setShowFramePreviews(false);
    try {
      controllerRef.current?.pause();
      const captured = await captureFilmFramesAroundTime({
        source: session.source,
        centerTime: currentTime,
        video,
        youtubePlayer: youtubePlayerRef.current,
        youtubeCaptureRoot: youtubeCaptureRootRef.current,
        count: FILM_CLIP_ANALYZE_FRAME_COUNT,
        onProgress: (current, total) => setCaptureProgress({ current, total }),
      });
      const previews = capturedFramesToPreviews(captured);
      setFramePreviews(previews);
      setShowFramePreviews(true);
      const coachTags = selectFilmEventsForAnalyze(events, currentTime);
      const disruptionTags = selectFilmDisruptionsForAnalyze(disruptions, currentTime);
      const context = buildFilmAnalyzeContext(
        coachTags,
        captured.times,
        disruptionTags,
      );
      setAnalyzeContext(context);
      setAnalyzePhase("analyzing");
      const result = await analyzeFilmClip({
        frames: captured.frames,
        frameTimes: captured.times,
        timestamp: currentTime,
        sessionTitle: session.title,
        filmEvents: coachTags.map((event) => ({
          kind: event.kind,
          time: event.time,
          note: event.note,
        })),
        filmDisruptions: disruptionTags.map((row) => ({
          kind: row.kind,
          time: row.time,
          note: row.note,
        })),
      });
      setHistoryPlayheadTime(null);
      setAnalysisResult(result);
      appendAnalysisRecord(
        session.id,
        createFilmAnalysisRecord({
          playheadTime: currentTime,
          result,
          frameCount: captured.frames.length,
          coachTags: coachTags.map((tag) => ({
            kind: tag.kind,
            time: tag.time,
            note: tag.note,
          })),
          disruptionTags: disruptionTags.map((tag) => ({
            kind: tag.kind,
            time: tag.time,
            note: tag.note,
          })),
        }),
      );
      setAnalyzeModalOpen(true);
    } catch (err) {
      appNotice(
        "Analyze clip",
        err instanceof Error ? err.message : "Analysis failed.",
      );
    } finally {
      setAnalyzeBusy(false);
      setAnalyzePhase(null);
    }
  }

  return (
    <div className="fc-film-annotator">
      <header className="fc-film-annotator-head">
        <div>
          <h2 className="fc-film-annotator-title">{session.title}</h2>
          <p className="fc-film-annotator-meta">
            {filmRoomSourceLabel(session.source)} · {strokes.length} annotation
            {strokes.length === 1 ? "" : "s"}
            {events.length > 0 ? (
              <>
                {" "}
                · {events.length} event tag{events.length === 1 ? "" : "s"}
              </>
            ) : null}
            {disruptions.length > 0 ? (
              <>
                {" "}
                · {disruptions.length} disruption{disruptions.length === 1 ? "" : "s"}
              </>
            ) : null}
            {analyses.length > 0 ? (
              <>
                {" "}
                · {analyses.length} analysis{analyses.length === 1 ? "" : "es"}
              </>
            ) : null}
            {aiStatus.loading ? null : aiStatus.configured ? (
              <> · AI ready</>
            ) : (
              <> · AI off</>
            )}
          </p>
          {!aiStatus.loading && !aiStatus.configured ? (
            <p className="fc-film-ai-setup-hint">
              Set <code>OPENAI_API_KEY</code> to enable Analyze clip.
            </p>
          ) : null}
          {session.source.kind === "youtube" ? (
            <p className="fc-film-ai-setup-hint">
              YouTube analyze uses visible-player capture — upload MP4 if frames look blank.
            </p>
          ) : null}
        </div>
        <div className="fc-film-annotator-actions">
          <button
            type="button"
            className="fc-film-analyze-btn"
            disabled={!canAnalyzeClip || analyzeBusy || aiStatus.configured === false}
            title={
              !canAnalyzeClip
                ? "Video source not supported for AI analyze"
                : aiStatus.configured === false
                  ? "Add OPENAI_API_KEY to enable AI Assistant"
                  : `AI Coaching Assistant — ${FILM_CLIP_ANALYZE_FRAME_COUNT} frames + nearby coach tags`
            }
            onClick={() => void handleAnalyzeClip()}
          >
            {analyzePhase === "capturing"
              ? `Capturing ${captureProgress.current}/${captureProgress.total}…`
              : analyzePhase === "analyzing"
                ? "Analyzing…"
                : "Analyze clip"}
          </button>
          <button
            type="button"
            className="fc-film-game-plan-btn"
            onClick={() => setGamePlanModalOpen(true)}
          >
            Add to game plan
          </button>
        </div>
      </header>

      <div
        ref={playerShellRef}
        className="fc-film-player-shell"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.code !== "Space" && e.key !== " ") {
            const target = e.target as HTMLElement;
            if (
              target.tagName !== "INPUT" &&
              target.tagName !== "TEXTAREA" &&
              !e.metaKey &&
              !e.ctrlKey &&
              !e.altKey
            ) {
              const kind = FILM_EVENT_KEYBOARD_MAP[e.key];
              if (kind) {
                e.preventDefault();
                handleTagAtPlayhead(kind, tagNoteDraft.trim() || undefined);
                if (tagNoteDraft.trim()) setTagNoteDraft("");
                return;
              }
              const disruptionKind = FILM_DISRUPTION_KEYBOARD_MAP[e.key.toLowerCase()];
              if (disruptionKind) {
                e.preventDefault();
                handleDisruptionAtPlayhead(
                  disruptionKind,
                  tagNoteDraft.trim() || undefined,
                );
                if (tagNoteDraft.trim()) setTagNoteDraft("");
                return;
              }
              if (e.key === "b" || e.key === "B") {
                e.preventDefault();
                if (e.shiftKey) {
                  handleAddBookmark("Plan broke here", undefined, "disruption");
                } else {
                  handleAddBookmark(defaultFilmBookmarkLabel(currentTime));
                }
              }
            }
            return;
          }
          if (!isFilmFullscreen()) return;
          e.preventDefault();
          e.stopPropagation();
          togglePlay();
        }}
      >
        <FilmRoomToolbar
          activePreset={activePreset}
          onPresetChange={setActivePreset}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          onClear={clearPenDrawings}
        />

        <FilmRoomEventTagBar
          currentTime={currentTime}
          events={events}
          noteDraft={tagNoteDraft}
          disabled={duration <= 0}
          canUndo={events.length > 0}
          onNoteChange={setTagNoteDraft}
          onTag={handleTagAtPlayhead}
          onUndoLast={() => undoLastFilmEvent(session.id)}
          onUpdate={(eventId, patch) => updateFilmEvent(session.id, eventId, patch)}
          onRemove={(eventId) => removeFilmEvent(session.id, eventId)}
          onSeek={handleSliderSeek}
        />

        <FilmRoomDisruptionTagBar
          currentTime={currentTime}
          disruptions={disruptions}
          noteDraft={tagNoteDraft}
          disabled={duration <= 0}
          canUndo={disruptions.length > 0}
          onNoteChange={setTagNoteDraft}
          onTag={handleDisruptionAtPlayhead}
          onUndoLast={() => undoLastFilmDisruption(session.id)}
          onUpdate={(disruptionId, patch) =>
            updateFilmDisruption(session.id, disruptionId, patch)
          }
          onRemove={(disruptionId) => removeFilmDisruption(session.id, disruptionId)}
          onSeek={handleSliderSeek}
        />

        <FilmRoomBookmarkBar
          currentTime={currentTime}
          bookmarks={bookmarks}
          disabled={duration <= 0}
          onAdd={handleAddBookmark}
          onUpdate={(bookmarkId, patch) =>
            updateFilmBookmark(session.id, bookmarkId, patch)
          }
          onRemove={(bookmarkId) => removeFilmBookmark(session.id, bookmarkId)}
          onSeek={handleSliderSeek}
        />

        <FilmRoomFramePreviewStrip previews={framePreviews} open={showFramePreviews} />

        <FilmRoomAnalysisHistoryPanel
          analyses={analyses}
          bookmarkCount={bookmarks.length}
          onOpen={openAnalysisRecord}
          onSeek={handleSliderSeek}
          onRemove={(recordId) => removeAnalysisRecord(session.id, recordId)}
          onExportSession={
            analyses.length || bookmarks.length ? exportSessionScoutPdf : undefined
          }
        />

        <div className="fc-film-stage">
          <div ref={overlayRef} className="fc-film-video-stack">
            <FilmRoomVideoSurface
              source={session.source}
              uploadSrc={uploadSrc}
              onNativeVideo={(video) => {
                nativeVideoRef.current = video;
              }}
              onYouTubePlayer={(player) => {
                youtubePlayerRef.current = player;
              }}
              onYouTubeCaptureRoot={(element) => {
                youtubeCaptureRootRef.current = element;
              }}
              onController={handleController}
              onTimeUpdate={setCurrentTime}
              onDuration={setDuration}
              onPlayingChange={setPlaying}
            />
            {overlaySize.width > 0 && overlaySize.height > 0 ? (
              <VideoAnnotationCanvas
                key={`${session.id}-${canvasEpoch}`}
                width={overlaySize.width}
                height={overlaySize.height}
                strokes={strokes}
                currentTime={currentTime}
                tool={tool}
                inkColor={inkColor}
                inkWidth={inkWidth}
                onStrokeStart={() => controllerRef.current?.pause()}
                onStrokeComplete={handleStrokeComplete}
                onStrokesChange={handleStrokesChange}
                onEraserGestureStart={handleEraserGestureStart}
              />
            ) : null}
            <FilmRoomFloatingShuttleWheel
              key={`${session.id}-${shuttlePositionKey}`}
              boundsRef={overlayRef}
              boundsWidth={overlaySize.width}
              boundsHeight={overlaySize.height}
              disabled={duration <= 0}
              playing={playing}
              onTogglePlay={togglePlay}
              onJogStart={handleJogStart}
              onJog={handleJog}
              onJogEnd={() => undefined}
            />
            <FilmRoomVideoControlDock
              playing={playing}
              currentTime={currentTime}
              duration={duration}
              markerTimes={markerTimes}
              eventMarkerTimes={eventMarkerTimes}
              disruptionMarkerTimes={disruptionMarkerTimes}
              bookmarkMarkerTimes={bookmarkMarkerTimes}
              fullscreen={fullscreen}
              autoClearOnScrub={autoClearOnScrub}
              onToggleAutoClear={() => setAutoClearOnScrub((value) => !value)}
              onTogglePlay={togglePlay}
              onSeek={handleSliderSeek}
              onToggleFullscreen={() => void toggleFullscreen()}
            />
          </div>
        </div>
      </div>

      <p className="fc-film-hint">
        Hold the wheel to move it; rotate to jog. Use the timeline for quick jumps. Press <kbd>F</kbd>{" "}
        or ⛶ for fullscreen; <kbd>Space</kbd> play/pause in fullscreen.
      </p>

      <FilmRoomAddToGamePlanModal
        open={gamePlanModalOpen}
        sessionId={session.id}
        sessionTitle={session.title}
        currentTime={currentTime}
        onClose={() => setGamePlanModalOpen(false)}
      />

      {analysisResult ? (
        <FilmRoomAnalyzeModal
          open={analyzeModalOpen}
          sessionId={session.id}
          sessionTitle={session.title}
          sessionSource={session.source}
          currentTime={historyPlayheadTime ?? currentTime}
          analysis={analysisResult}
          analyzeContext={analyzeContext}
          onClose={() => {
            setAnalyzeModalOpen(false);
            setAnalysisResult(null);
            setAnalyzeContext(null);
            setHistoryPlayheadTime(null);
          }}
        />
      ) : null}

      {scoutPrintModel ? (
        <FilmScoutPrintOverlay
          model={scoutPrintModel}
          onClose={() => setScoutPrintModel(null)}
        />
      ) : null}
    </div>
  );
}
