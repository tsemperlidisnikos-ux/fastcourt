import {
  captureVideoFramesAroundTime,
  type CapturedVideoFrames,
  FILM_CLIP_ANALYZE_FRAME_COUNT,
  FILM_CLIP_ANALYZE_WINDOW_SEC,
} from "@/lib/film-room/capture-video-frames";
import { captureYouTubeFramesAroundTime } from "@/lib/film-room/capture-youtube-frames";
import type { YouTubePlayerInstance } from "@/lib/film-room/youtube-iframe-api";
import type { FilmRoomVideoSource } from "@/types/film-room";

export interface CaptureFilmFramesInput {
  source: FilmRoomVideoSource;
  centerTime: number;
  video?: HTMLVideoElement | null;
  youtubePlayer?: YouTubePlayerInstance | null;
  youtubeCaptureRoot?: HTMLElement | null;
  count?: number;
  windowSec?: number;
  maxWidth?: number;
  jpegQuality?: number;
  onProgress?: (current: number, total: number) => void;
}

export async function captureFilmFramesAroundTime(
  input: CaptureFilmFramesInput,
): Promise<CapturedVideoFrames> {
  const options = {
    count: input.count ?? FILM_CLIP_ANALYZE_FRAME_COUNT,
    windowSec: input.windowSec ?? FILM_CLIP_ANALYZE_WINDOW_SEC,
    maxWidth: input.maxWidth,
    jpegQuality: input.jpegQuality,
    onProgress: input.onProgress,
  };

  if (input.source.kind === "youtube") {
    if (!input.youtubePlayer || !input.youtubeCaptureRoot) {
      throw new Error("YouTube player is not ready for capture.");
    }
    return captureYouTubeFramesAroundTime(
      input.youtubePlayer,
      input.youtubeCaptureRoot,
      input.centerTime,
      options,
    );
  }

  if (!input.video) {
    throw new Error("Video is not ready for capture.");
  }

  return captureVideoFramesAroundTime(input.video, input.centerTime, options);
}

export function canCaptureFilmFrames(source: FilmRoomVideoSource): boolean {
  return (
    source.kind === "upload" ||
    source.kind === "direct" ||
    source.kind === "youtube"
  );
}

export interface FilmFramePreview {
  time: number;
  dataUrl: string;
}

export function capturedFramesToPreviews(captured: CapturedVideoFrames): FilmFramePreview[] {
  return captured.frames.map((frame, index) => ({
    time: captured.times[index] ?? 0,
    dataUrl: `data:image/jpeg;base64,${frame}`,
  }));
}
