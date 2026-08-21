"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { FilmRoomPossessionPlaylist, type FilmRoomPossessionPlaylistHandle } from "@/components/film-room/FilmRoomPossessionPlaylist";
import { FilmRoomEvaluationStrip } from "@/components/film-room/FilmRoomEvaluationStrip";
import { FilmRoomAnalysisHistoryPanel } from "@/components/film-room/FilmRoomAnalysisHistoryPanel";
import { FilmRoomFramePreviewStrip } from "@/components/film-room/FilmRoomFramePreviewStrip";
import { FilmRoomEventTagBar } from "@/components/film-room/FilmRoomEventTagBar";
import { FilmRoomDisruptionTagBar } from "@/components/film-room/FilmRoomDisruptionTagBar";
import { FilmRoomFloatingShuttleWheel } from "@/components/film-room/FilmRoomFloatingShuttleWheel";
import { FilmRoomAddToGamePlanModal } from "@/components/film-room/FilmRoomAddToGamePlanModal";
import { FilmRoomAnalyzeModal } from "@/components/film-room/FilmRoomAnalyzeModal";
import { FilmScoutPrintOverlay } from "@/components/film-room/FilmScoutPrintOverlay";
import { FilmRoomToolbar } from "@/components/film-room/FilmRoomToolbar";
import { FilmRoomFloatingMarkupToolbar } from "@/components/film-room/FilmRoomFloatingMarkupToolbar";
import { FilmRoomVideoControlDock } from "@/components/film-room/FilmRoomVideoControlDock";
import {
  FilmRoomVideoSurface,
  type VideoPlaybackController,
} from "@/components/film-room/FilmRoomVideoSurface";
import { VideoAnnotationCanvas } from "@/components/film-room/VideoAnnotationCanvas";
import { useCountersDemo } from "@/hooks/useCountersDemo";
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
import { buildPossessionReelManifest } from "@/lib/film-room/possession-reel-export";
import { buildPossessionPlaylist } from "@/lib/film-room/film-possession-playlist";
import { buildFilmReelShareUrl } from "@/lib/film-room/film-reel-share";
import {
  buildBatchAnalyzeTargets,
  formatBatchSummaryLine,
  summarizeBatchAnalysis,
} from "@/lib/film-room/film-batch-analyze";
import { defaultFilmBookmarkLabel, FILM_DISRUPTION_BOOKMARK_LABEL } from "@/lib/film-room/film-room-bookmarks";
import {
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "@/lib/settings/pdf-brand-export";
import { getFilmRoomBlob } from "@/lib/film-room/film-room-idb";
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
import type { PossessionReelSegment } from "@/lib/film-room/possession-reel-export";
import type { FilmScoutPrintModel } from "@/lib/film-room/film-scout-print-model";

interface Props {
  session: FilmRoomSession;
  initialSeekTime?: number | null;
  /** Full scout toolkit (tags, AI, game plan) — Scouting tab only. */
  scoutTools?: boolean;
}

export function FilmRoomAnnotator({
  session,
  initialSeekTime = null,
  scoutTools = false,
}: Props) {
  const { openDemo: openCountersDemo } = useCountersDemo();
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
  const tool = scoutTools ? "pointer" : markup.tool;
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
  const playlistRef = useRef<FilmRoomPossessionPlaylistHandle>(null);

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
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [analyzePhase, setAnalyzePhase] = useState<"capturing" | "analyzing" | null>(null);
  const [captureProgress, setCaptureProgress] = useState({ current: 0, total: FILM_CLIP_ANALYZE_FRAME_COUNT });
  const [analyzeContext, setAnalyzeContext] = useState<FilmAnalyzeContext | null>(null);
  const [tagNoteDraft, setTagNoteDraft] = useState("");
  const [framePreviews, setFramePreviews] = useState<FilmFramePreview[]>([]);
  const [showFramePreviews, setShowFramePreviews] = useState(false);
  const [historyPlayheadTime, setHistoryPlayheadTime] = useState<number | null>(null);
  const [scoutPrintModel, setScoutPrintModel] = useState<FilmScoutPrintModel | null>(null);
  const [reelActive, setReelActive] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [reelSegments, setReelSegments] = useState<PossessionReelSegment[]>([]);
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
    if (scoutTools) return;
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
  }, [scoutTools]);

  useEffect(() => {
    if (!scoutTools) return;
    const shell = playerShellRef.current;
    if (shell && document.fullscreenElement === shell) {
      void document.exitFullscreen();
    }
  }, [scoutTools]);

  const togglePlay = useCallback(() => {
    const c = controllerRef.current;
    if (!c) return;
    if (c.isPlaying()) c.pause();
    else c.play();
  }, []);

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

  const inkMarkerTimes = strokes.map((stroke) => ({
    id: stroke.id,
    time: stroke.time,
  }));

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        togglePlay();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        const c = controllerRef.current;
        if (!c) return;
        const next = Math.max(0, c.getCurrentTime() - (e.shiftKey ? 5 : 2));
        c.seek(next);
        setCurrentTime(next);
        return;
      }
      if (e.key === "ArrowRight" || e.key === "l" || e.key === "L") {
        e.preventDefault();
        const c = controllerRef.current;
        if (!c) return;
        const dur = c.getDuration();
        const nextTime = c.getCurrentTime() + (e.shiftKey ? 5 : 2);
        const next =
          Number.isFinite(dur) && dur > 0 ? Math.min(dur, nextTime) : nextTime;
        c.seek(next);
        setCurrentTime(next);
        return;
      }

      if ((e.key === "f" || e.key === "F") && !scoutTools) {
        e.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (e.key === "n" || e.key === "N" || e.key === "]") {
        if (bookmarks.length > 0) {
          e.preventDefault();
          playlistRef.current?.goNext();
        }
        return;
      }
      if (e.key === "[") {
        if (bookmarks.length > 0) {
          e.preventDefault();
          playlistRef.current?.goPrev();
        }
        return;
      }

      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        if (e.shiftKey) {
          if (scoutTools) {
            handleAddBookmark("Plan broke here", undefined, "disruption");
          }
        } else {
          handleAddBookmark(
            defaultFilmBookmarkLabel(
              controllerRef.current?.getCurrentTime() ?? currentTime,
            ),
          );
        }
        return;
      }

      if (!scoutTools) return;

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
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    bookmarks.length,
    currentTime,
    handleAddBookmark,
    handleDisruptionAtPlayhead,
    handleTagAtPlayhead,
    scoutTools,
    tagNoteDraft,
    toggleFullscreen,
    togglePlay,
  ]);

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
    const origin = window.location.origin;
    const reelManifest =
      bookmarks.length > 0
        ? buildPossessionReelManifest({
            sessionId: session.id,
            sessionTitle: session.title,
            source: session.source,
            origin,
            items: buildPossessionPlaylist(bookmarks, "all"),
            videoDuration: duration,
          })
        : null;
    const reelShare = reelManifest ? buildFilmReelShareUrl(reelManifest) : null;
    const model = buildFilmScoutPrintModelFromSession({
      session: {
        ...session,
        events,
        bookmarks,
        analyses,
      },
      origin,
      teamName: resolvePdfCoverTeam(pdfBrand),
      footerText: resolvePdfFooterText(pdfBrand),
      videoDuration: duration,
      reelShareLink: reelShare?.ok ? reelShare.url : undefined,
    });
    if (model) setScoutPrintModel(model);
  }, [analyses, bookmarks, duration, events, pdfBrand, session]);

  const canAnalyzeClip = canCaptureFilmFrames(session.source);

  async function performAnalyzeAtTime(
    playheadTime: number,
    options: { openModal?: boolean; storePreviews?: boolean } = {},
  ): Promise<FilmClipAnalysisResult | null> {
    const video = nativeVideoRef.current;
    if (session.source.kind !== "youtube" && !video) {
      throw new Error("Video is not ready yet. Try again in a moment.");
    }
    if (session.source.kind === "youtube" && !youtubePlayerRef.current) {
      throw new Error("YouTube player is not ready yet. Try again in a moment.");
    }

    controllerRef.current?.pause();
    const captured = await captureFilmFramesAroundTime({
      source: session.source,
      centerTime: playheadTime,
      video,
      youtubePlayer: youtubePlayerRef.current,
      youtubeCaptureRoot: youtubeCaptureRootRef.current,
      count: FILM_CLIP_ANALYZE_FRAME_COUNT,
      onProgress: (current, total) => setCaptureProgress({ current, total }),
    });
    if (options.storePreviews !== false) {
      const previews = capturedFramesToPreviews(captured);
      setFramePreviews(previews);
      setShowFramePreviews(true);
    }
    const coachTags = selectFilmEventsForAnalyze(events, playheadTime);
    const disruptionTags = selectFilmDisruptionsForAnalyze(disruptions, playheadTime);
    const context = buildFilmAnalyzeContext(coachTags, captured.times, disruptionTags);
    if (options.openModal !== false) {
      setAnalyzeContext(context);
    }
    setAnalyzePhase("analyzing");
    const result = await analyzeFilmClip({
      frames: captured.frames,
      frameTimes: captured.times,
      timestamp: playheadTime,
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
    appendAnalysisRecord(
      session.id,
      createFilmAnalysisRecord({
        playheadTime,
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
    if (result.disruption?.detected) {
      const note = result.disruption.whatBroke || result.disruption.summary;
      addFilmBookmark(
        session.id,
        playheadTime,
        FILM_DISRUPTION_BOOKMARK_LABEL,
        note,
        "disruption",
      );
    }
    if (options.openModal !== false) {
      setHistoryPlayheadTime(null);
      setAnalysisResult(result);
      setAnalyzeContext(context);
      setAnalyzeModalOpen(true);
    }
    return result;
  }

  async function handleAnalyzeClip() {
    if (!canAnalyzeClip || analyzeBusy || batchBusy) return;
    if (aiStatus.configured === false) {
      appNotice(
        "AI Assistant",
        "OpenAI is not configured on this server. Add OPENAI_API_KEY to .env.local (local) or Vercel Environment Variables (production), then restart.",
      );
      return;
    }

    setAnalyzeBusy(true);
    setAnalyzePhase("capturing");
    setCaptureProgress({ current: 0, total: FILM_CLIP_ANALYZE_FRAME_COUNT });
    setShowFramePreviews(false);
    try {
      await performAnalyzeAtTime(currentTime, { openModal: true, storePreviews: true });
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

  async function handleBatchAnalyze() {
    if (!canAnalyzeClip || analyzeBusy || batchBusy) return;
    if (aiStatus.configured === false) {
      appNotice(
        "AI Assistant",
        "OpenAI is not configured on this server. Add OPENAI_API_KEY to enable batch analyze.",
      );
      return;
    }
    const targets = buildBatchAnalyzeTargets(bookmarks, disruptions, "disruptions");
    if (!targets.length) {
      appNotice(
        "Batch analyze",
        "Add disruption tags or Plan broke here bookmarks first.",
      );
      return;
    }

    setBatchBusy(true);
    const analysesBefore = analyses.length;
    try {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index]!;
        setBatchProgress({ current: index + 1, total: targets.length });
        setAnalyzePhase("capturing");
        setCaptureProgress({ current: 0, total: FILM_CLIP_ANALYZE_FRAME_COUNT });
        await performAnalyzeAtTime(target.time, { openModal: false, storePreviews: false });
      }
      const updatedAnalyses =
        useFilmRoomStore.getState().sessions.find((row) => row.id === session.id)
          ?.analyses ?? analyses;
      const batchRecords = updatedAnalyses.slice(analysesBefore);
      const summary = summarizeBatchAnalysis(
        batchRecords.length ? batchRecords : updatedAnalyses,
      );
      appNotice("Batch analyze complete", formatBatchSummaryLine(summary));
      const origin = window.location.origin;
      const reelManifest =
        bookmarks.length > 0
          ? buildPossessionReelManifest({
              sessionId: session.id,
              sessionTitle: session.title,
              source: session.source,
              origin,
              items: buildPossessionPlaylist(bookmarks, "all"),
              videoDuration: duration,
            })
          : null;
      const reelShare = reelManifest ? buildFilmReelShareUrl(reelManifest) : null;
      const model = buildFilmScoutPrintModelFromSession({
        session: {
          ...session,
          events,
          bookmarks,
          analyses: updatedAnalyses,
        },
        origin,
        teamName: resolvePdfCoverTeam(pdfBrand),
        footerText: resolvePdfFooterText(pdfBrand),
        videoDuration: duration,
        reelShareLink: reelShare?.ok ? reelShare.url : undefined,
      });
      if (model) setScoutPrintModel(model);
    } catch (err) {
      appNotice(
        "Batch analyze",
        err instanceof Error ? err.message : "Batch analysis failed.",
      );
    } finally {
      setBatchBusy(false);
      setBatchProgress(null);
      setAnalyzePhase(null);
    }
  }

  const getUploadBlob = useCallback(async (): Promise<Blob | null> => {
    if (session.source.kind !== "upload") return null;
    return (await getFilmRoomBlob(session.source.blobId)) ?? null;
  }, [session.source]);

  const handleStopReel = useCallback(() => {
    setReelActive(false);
    setReelIndex(0);
    setReelSegments([]);
    controllerRef.current?.pause();
  }, []);

  const handleStartReel = useCallback(
    (segments: PossessionReelSegment[]) => {
      if (!segments.length) return;
      setReelSegments(segments);
      setReelActive(true);
      setReelIndex(0);
      handleSliderSeek(segments[0]!.startSec);
      controllerRef.current?.play();
    },
    [handleSliderSeek],
  );

  useEffect(() => {
    if (!reelActive || !playing || !reelSegments.length) return;
    const segment = reelSegments[reelIndex];
    if (!segment) {
      handleStopReel();
      return;
    }
    if (currentTime < segment.endSec - 0.2) return;
    const nextIndex = reelIndex + 1;
    if (nextIndex >= reelSegments.length) {
      handleStopReel();
      appNotice(
        "Reel complete",
        `Played ${reelSegments.length} possession clip${reelSegments.length === 1 ? "" : "s"}.`,
      );
      return;
    }
    setReelIndex(nextIndex);
    handleSliderSeek(reelSegments[nextIndex]!.startSec);
    controllerRef.current?.play();
  }, [
    currentTime,
    playing,
    reelActive,
    reelIndex,
    reelSegments,
    handleSliderSeek,
    handleStopReel,
  ]);

  const centerFilmPreviewUrl =
    framePreviews[Math.floor(framePreviews.length / 2)]?.dataUrl ?? undefined;

  const handlePlayerShellKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      // Window-level handler owns Space / tags / bookmarks.
      // Keep shell focusable for accessibility without duplicate shortcuts.
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
      }
    },
    [],
  );

  return (
    <div className="fc-film-annotator">
      <div className="fc-film-annotator-body">
        <div
          ref={playerShellRef}
          className="fc-film-annotator-video-col fc-film-player-shell"
          tabIndex={-1}
          onKeyDown={handlePlayerShellKeyDown}
        >
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
                  key={`canvas-${session.id}-${canvasEpoch}`}
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
                key={`shuttle-${session.id}-${shuttlePositionKey}`}
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
              {!scoutTools ? (
                <FilmRoomFloatingMarkupToolbar
                  boundsRef={overlayRef}
                  boundsWidth={overlaySize.width}
                  boundsHeight={overlaySize.height}
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
                </FilmRoomFloatingMarkupToolbar>
              ) : null}
              <FilmRoomVideoControlDock
                playing={playing}
                currentTime={currentTime}
                duration={duration}
                markerTimes={scoutTools ? inkMarkerTimes : []}
                eventMarkerTimes={scoutTools ? eventMarkerTimes : []}
                disruptionMarkerTimes={scoutTools ? disruptionMarkerTimes : []}
                bookmarkMarkerTimes={bookmarkMarkerTimes}
                fullscreen={fullscreen}
                allowFullscreen={!scoutTools}
                autoClearOnScrub={autoClearOnScrub}
                onToggleAutoClear={() => setAutoClearOnScrub((value) => !value)}
                onTogglePlay={togglePlay}
                onSeek={handleSliderSeek}
                onToggleFullscreen={() => void toggleFullscreen()}
              />
            </div>
          </div>
        </div>

        <aside className="fc-film-annotator-tools-col" aria-label="Film tools">
          <header className="fc-film-annotator-head">
            <div>
              <h2 className="fc-film-annotator-title">{session.title}</h2>
              <p className="fc-film-annotator-meta">
                {filmRoomSourceLabel(session.source)} · {strokes.length} annotation
                {strokes.length === 1 ? "" : "s"}
                {scoutTools && events.length > 0 ? (
                  <>
                    {" "}
                    · {events.length} event tag{events.length === 1 ? "" : "s"}
                  </>
                ) : null}
                {scoutTools && disruptions.length > 0 ? (
                  <>
                    {" "}
                    · {disruptions.length} disruption{disruptions.length === 1 ? "" : "s"}
                  </>
                ) : null}
                {scoutTools && analyses.length > 0 ? (
                  <>
                    {" "}
                    · {analyses.length} analysis{analyses.length === 1 ? "" : "es"}
                  </>
                ) : null}
                {scoutTools && !aiStatus.loading && aiStatus.configured ? (
                  <> · AI ready</>
                ) : scoutTools && !aiStatus.loading && !aiStatus.configured ? (
                  <> · AI off</>
                ) : null}
              </p>
              {scoutTools && !aiStatus.loading && !aiStatus.configured ? (
                <p className="fc-film-ai-setup-hint">
                  Set <code>OPENAI_API_KEY</code> to enable Analyze clip.
                </p>
              ) : null}
              {scoutTools && session.source.kind === "youtube" ? (
                <p className="fc-film-ai-setup-hint">
                  YouTube analyze uses visible-player capture — upload MP4 if frames look blank.
                </p>
              ) : null}
            </div>
            {scoutTools ? (
              <div className="fc-film-annotator-actions">
                <button
                  type="button"
                  className="fc-film-counters-demo-btn"
                  onClick={openCountersDemo}
                  title="Counters walkthrough with fictional scout data"
                >
                  Counters demo
                </button>
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
            ) : null}
          </header>

          {scoutTools ? (
            <>
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
            </>
          ) : null}

          <FilmRoomPossessionPlaylist
            ref={playlistRef}
            sessionId={session.id}
            sessionTitle={session.title}
            source={session.source}
            bookmarks={bookmarks}
            currentTime={currentTime}
            videoDuration={duration}
            disabled={duration <= 0}
            reelActive={reelActive}
            reelIndex={reelIndex}
            onSeek={handleSliderSeek}
            onPlay={() => controllerRef.current?.play()}
            onStartReel={handleStartReel}
            onStopReel={handleStopReel}
            getUploadBlob={getUploadBlob}
          />

          <FilmRoomFramePreviewStrip previews={framePreviews} open={showFramePreviews} />

          {scoutTools ? (
            <>
              <FilmRoomAnalysisHistoryPanel
                analyses={analyses}
                bookmarkCount={bookmarks.length}
                onOpen={openAnalysisRecord}
                onSeek={handleSliderSeek}
                onRemove={(recordId) => removeAnalysisRecord(session.id, recordId)}
                onExportSession={
                  analyses.length || bookmarks.length ? exportSessionScoutPdf : undefined
                }
                onBatchAnalyze={canAnalyzeClip ? handleBatchAnalyze : undefined}
                batchBusy={batchBusy}
                batchProgress={batchProgress}
              />

              <FilmRoomEvaluationStrip analyses={analyses} />
            </>
          ) : null}
        </aside>
      </div>

      <p className="fc-film-hint">
        Hold the wheel to move it; rotate to jog. Use the timeline for quick jumps.{" "}
        <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> or <kbd>J</kbd>/<kbd>L</kbd>{" "}
        jog · <kbd>B</kbd> chapter bookmark
        {scoutTools ? (
          <> · number keys tag events · <kbd>Shift+B</kbd> plan break</>
        ) : (
          <>
            {" "}
            · <kbd>F</kbd> fullscreen
          </>
        )}
        .
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
          filmPreviewUrl={centerFilmPreviewUrl}
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
