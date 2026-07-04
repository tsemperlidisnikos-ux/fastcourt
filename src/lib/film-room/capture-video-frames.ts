function waitForVideoSeek(video: HTMLVideoElement, targetTime: number) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Video seek timed out"));
    }, 8000);

    function cleanup() {
      window.clearTimeout(timeout);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    }

    function onSeeked() {
      if (Math.abs(video.currentTime - targetTime) > 0.35) return;
      cleanup();
      resolve();
    }

    function onError() {
      cleanup();
      reject(new Error("Video seek failed"));
    }

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    if (Math.abs(video.currentTime - targetTime) <= 0.05) {
      cleanup();
      resolve();
    }
  });
}

export const FILM_CLIP_ANALYZE_FRAME_COUNT = 10;
export const FILM_CLIP_ANALYZE_FRAME_MAX = 12;
export const FILM_CLIP_ANALYZE_WINDOW_SEC = 2;

/** Evenly sample frame times across a window centered on the playhead. */
export function computeFrameTimes(
  centerTime: number,
  duration: number,
  count: number,
  windowSec: number,
): number[] {
  const safeCount = Math.min(
    FILM_CLIP_ANALYZE_FRAME_MAX,
    Math.max(1, Math.floor(count)),
  );
  if (safeCount <= 1) {
    return [Math.min(duration - 0.05, Math.max(0, centerTime))];
  }

  const half = windowSec / 2;
  const start = centerTime - half;
  const end = centerTime + half;
  const times: number[] = [];

  for (let i = 0; i < safeCount; i++) {
    const t = start + (i / (safeCount - 1)) * (end - start);
    times.push(Math.min(duration - 0.05, Math.max(0, t)));
  }

  return times;
}

export interface CapturedVideoFrames {
  frames: string[];
  times: number[];
}

/** Capture JPEG base64 frames (no data: prefix) around the playhead. */
export async function captureVideoFramesAroundTime(
  video: HTMLVideoElement,
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

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("Video is not ready for capture.");
  }

  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Video duration unavailable.");
  }

  const times = computeFrameTimes(centerTime, duration, count, windowSec);

  const savedTime = video.currentTime;
  const wasPaused = video.paused;
  video.pause();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");

  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

  const frames: string[] = [];

  try {
    for (let i = 0; i < times.length; i++) {
      const time = times[i]!;
      video.currentTime = time;
      await waitForVideoSeek(video, time);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);
      const base64 = dataUrl.split(",")[1];
      if (!base64) throw new Error("Frame capture failed.");
      frames.push(base64);
      options?.onProgress?.(i + 1, times.length);
    }
  } finally {
    video.currentTime = savedTime;
    if (!wasPaused) {
      void video.play().catch(() => undefined);
    }
  }

  return { frames, times };
}
