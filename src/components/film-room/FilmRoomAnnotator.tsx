"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilmRoomToolbar } from "@/components/film-room/FilmRoomToolbar";
import { FilmRoomVideoControlDock } from "@/components/film-room/FilmRoomVideoControlDock";
import {
  FilmRoomVideoSurface,
  type VideoPlaybackController,
} from "@/components/film-room/FilmRoomVideoSurface";
import { VideoAnnotationCanvas } from "@/components/film-room/VideoAnnotationCanvas";
import { filmRoomSourceLabel } from "@/lib/film-room/film-room-source";
import {
  DEFAULT_FILM_ROOM_MARKUP_PRESET,
  filmRoomMarkupPreset,
  type FilmRoomMarkupPreset,
} from "@/lib/film-room/markup-toolbar-presets";
import { useFilmRoomStore } from "@/stores/film-room-store";
import type { FilmRoomSession, VideoAnnotationStroke } from "@/types/film-room";

interface Props {
  session: FilmRoomSession;
}

export function FilmRoomAnnotator({ session }: Props) {
  const setStrokes = useFilmRoomStore((s) => s.setStrokes);
  const appendStroke = useFilmRoomStore((s) => s.appendStroke);
  const clearPenStrokes = useFilmRoomStore((s) => s.clearPenStrokes);
  const resolveUploadObjectUrl = useFilmRoomStore((s) => s.resolveUploadObjectUrl);
  const strokes = useFilmRoomStore(
    (s) => s.sessions.find((row) => row.id === session.id)?.strokes ?? session.strokes,
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

  const recordUndo = useCallback(() => {
    setUndoStack((stack) => [...stack, strokesRef.current]);
    setRedoStack([]);
  }, []);

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

  return (
    <div className="fc-film-annotator">
      <header className="fc-film-annotator-head">
        <div>
          <h2 className="fc-film-annotator-title">{session.title}</h2>
          <p className="fc-film-annotator-meta">
            {filmRoomSourceLabel(session.source)} · {strokes.length} annotation
            {strokes.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <div
        ref={playerShellRef}
        className="fc-film-player-shell"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.code !== "Space" && e.key !== " ") return;
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

        <div className="fc-film-stage">
          <div ref={overlayRef} className="fc-film-video-stack">
            <FilmRoomVideoSurface
              source={session.source}
              uploadSrc={uploadSrc}
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
            <FilmRoomVideoControlDock
              playing={playing}
              currentTime={currentTime}
              duration={duration}
              markerTimes={markerTimes}
              fullscreen={fullscreen}
              onTogglePlay={togglePlay}
              onSeek={seek}
              onToggleFullscreen={() => void toggleFullscreen()}
            />
          </div>
        </div>
      </div>

      <p className="fc-film-hint">
        Draw while paused or playing — marks appear when playback reaches that moment (like Video
        Pencil). Press <kbd>F</kbd> or ⛶ for fullscreen; <kbd>Space</kbd> play/pause in fullscreen.
      </p>
    </div>
  );
}
