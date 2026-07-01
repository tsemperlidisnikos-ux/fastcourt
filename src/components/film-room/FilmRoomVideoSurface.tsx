"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createYouTubePlayer,
  type YouTubePlayerInstance,
  type YouTubePlayerState,
} from "@/lib/film-room/youtube-iframe-api";
import type { FilmRoomVideoSource } from "@/types/film-room";

export interface VideoPlaybackController {
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  isPlaying: () => boolean;
}

interface Props {
  source: FilmRoomVideoSource;
  uploadSrc?: string | null;
  onController: (controller: VideoPlaybackController | null) => void;
  onTimeUpdate?: (time: number) => void;
  onDuration?: (duration: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

const YT_PLAYING = 1;

function formatClock(totalSec: number) {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "0:00";
  const sec = Math.floor(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FilmRoomVideoSurface({
  source,
  uploadSrc,
  onController,
  onTimeUpdate,
  onDuration,
  onPlayingChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YouTubePlayerInstance | null>(null);
  const [nativeDuration, setNativeDuration] = useState(0);

  const publishNativeController = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      onController(null);
      return;
    }
    onController({
      getCurrentTime: () => video.currentTime,
      getDuration: () => video.duration || 0,
      play: () => void video.play(),
      pause: () => video.pause(),
      seek: (seconds) => {
        video.currentTime = seconds;
      },
      isPlaying: () => !video.paused && !video.ended,
    });
  }, [onController]);

  useEffect(() => {
    if (source.kind === "youtube") return;
    publishNativeController();
  }, [source, uploadSrc, publishNativeController]);

  useEffect(() => {
    if (source.kind !== "youtube" || !ytHostRef.current) return;

    let cancelled = false;

    createYouTubePlayer(
      ytHostRef.current,
      source.videoId,
      (readyPlayer) => {
        if (cancelled) {
          readyPlayer.destroy();
          return;
        }
        ytPlayerRef.current = readyPlayer;
        onController({
          getCurrentTime: () => readyPlayer.getCurrentTime(),
          getDuration: () => readyPlayer.getDuration(),
          play: () => readyPlayer.playVideo(),
          pause: () => readyPlayer.pauseVideo(),
          seek: (seconds) => readyPlayer.seekTo(seconds, true),
          isPlaying: () => readyPlayer.getPlayerState() === YT_PLAYING,
        });
        onDuration?.(readyPlayer.getDuration());
      },
      (state: YouTubePlayerState) => {
        onPlayingChange?.(state === YT_PLAYING);
      },
    ).catch(() => {
      onController(null);
    });

    return () => {
      cancelled = true;
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
      onController(null);
    };
  }, [source, onController, onDuration, onPlayingChange]);

  useEffect(() => {
    const tick = () => {
      if (source.kind === "youtube") {
        const player = ytPlayerRef.current;
        if (player) {
          onTimeUpdate?.(player.getCurrentTime());
          const dur = player.getDuration();
          if (dur > 0) onDuration?.(dur);
          onPlayingChange?.(player.getPlayerState() === YT_PLAYING);
        }
      } else {
        const video = videoRef.current;
        if (video) {
          onTimeUpdate?.(video.currentTime);
          if (video.duration > 0) onDuration?.(video.duration);
          onPlayingChange?.(!video.paused && !video.ended);
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    let frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [source, onTimeUpdate, onDuration, onPlayingChange]);

  if (source.kind === "youtube") {
    return (
      <div className="fc-film-video-surface fc-film-video-youtube">
        <div ref={ytHostRef} className="fc-film-youtube-host" />
      </div>
    );
  }

  const src =
    source.kind === "upload" ? uploadSrc : source.kind === "direct" ? source.url : null;

  return (
    <div className="fc-film-video-surface">
      <video
        ref={videoRef}
        className="fc-film-native-video"
        src={src ?? undefined}
        controls={false}
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          setNativeDuration(dur);
          onDuration?.(dur);
          publishNativeController();
        }}
        onPlay={() => onPlayingChange?.(true)}
        onPause={() => onPlayingChange?.(false)}
        onEnded={() => onPlayingChange?.(false)}
      />
      {!src ? (
        <div className="fc-film-video-missing">Video file unavailable.</div>
      ) : null}
      {nativeDuration > 0 ? (
        <span className="fc-film-video-duration-badge" aria-hidden="true">
          {formatClock(nativeDuration)}
        </span>
      ) : null}
    </div>
  );
}
