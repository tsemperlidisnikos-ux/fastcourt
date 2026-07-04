import html2canvas from "html2canvas";
import type { YouTubePlayerInstance } from "@/lib/film-room/youtube-iframe-api";
import {
  computeFrameTimes,
  FILM_CLIP_ANALYZE_FRAME_COUNT,
  FILM_CLIP_ANALYZE_FRAME_MAX,
  FILM_CLIP_ANALYZE_WINDOW_SEC,
  type CapturedVideoFrames,
} from "@/lib/film-room/capture-video-frames";

const YT_BUFFERING = 3;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function waitForYouTubeSeek(player: YouTubePlayerInstance, targetTime: number) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      reject(new Error("YouTube seek timed out"));
    }, 12_000);

    player.pauseVideo();
    player.seekTo(targetTime, true);

    const interval = window.setInterval(() => {
      const state = player.getPlayerState();
      const current = player.getCurrentTime();
      if (state !== YT_BUFFERING && Math.abs(current - targetTime) <= 0.45) {
        window.clearInterval(interval);
        window.clearTimeout(timeout);
        void wait(500).then(resolve);
      }
    }, 120);
  });
}

function averageCanvasLuma(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  const sampleW = Math.min(32, canvas.width);
  const sampleH = Math.min(32, canvas.height);
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
  }
  return sum / (data.length / 4);
}

async function captureElementJpegBase64(
  element: HTMLElement,
  maxWidth: number,
  jpegQuality: number,
): Promise<string> {
  const scale = Math.min(1, maxWidth / Math.max(1, element.clientWidth));
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#000000",
    logging: false,
    scale,
  });

  let output = canvas;
  if (canvas.width > maxWidth) {
    const scaled = document.createElement("canvas");
    const ratio = maxWidth / canvas.width;
    scaled.width = maxWidth;
    scaled.height = Math.max(1, Math.round(canvas.height * ratio));
    const ctx = scaled.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");
    ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    output = scaled;
  }

  if (averageCanvasLuma(output) < 8) {
    throw new Error(
      "Could not capture YouTube frames (player blocked screenshot). Upload an MP4 for reliable AI analyze.",
    );
  }

  const dataUrl = output.toDataURL("image/jpeg", jpegQuality);
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("YouTube frame capture failed.");
  return base64;
}

/** Capture frames from a visible YouTube embed via html2canvas (best-effort). */
export async function captureYouTubeFramesAroundTime(
  player: YouTubePlayerInstance,
  captureRoot: HTMLElement,
  centerTime: number,
  options?: {
    count?: number;
    windowSec?: number;
    maxWidth?: number;
    jpegQuality?: number;
    onProgress?: (current: number, total: number) => void;
  },
): Promise<CapturedVideoFrames> {
  const count = Math.min(
    FILM_CLIP_ANALYZE_FRAME_MAX,
    Math.max(1, options?.count ?? FILM_CLIP_ANALYZE_FRAME_COUNT),
  );
  const windowSec = options?.windowSec ?? FILM_CLIP_ANALYZE_WINDOW_SEC;
  const maxWidth = options?.maxWidth ?? 640;
  const jpegQuality = options?.jpegQuality ?? 0.72;

  const duration = player.getDuration();
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("YouTube duration unavailable.");
  }

  const times = computeFrameTimes(centerTime, duration, count, windowSec);
  const savedTime = player.getCurrentTime();
  const frames: string[] = [];

  try {
    for (let i = 0; i < times.length; i++) {
      const time = times[i]!;
      await waitForYouTubeSeek(player, time);
      frames.push(await captureElementJpegBase64(captureRoot, maxWidth, jpegQuality));
      options?.onProgress?.(i + 1, times.length);
    }
  } finally {
    try {
      player.seekTo(savedTime, true);
    } catch {
      /* player may be destroyed */
    }
  }

  return { frames, times };
}
