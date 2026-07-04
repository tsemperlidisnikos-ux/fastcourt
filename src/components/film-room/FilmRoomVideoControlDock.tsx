"use client";

interface Props {
  playing: boolean;
  currentTime: number;
  duration: number;
  markerTimes: number[];
  eventMarkerTimes?: Array<{ id: string; time: number }>;
  fullscreen: boolean;
  autoClearOnScrub: boolean;
  onToggleAutoClear: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onToggleFullscreen: () => void;
}

function formatClock(totalSec: number) {
  if (!Number.isFinite(totalSec) || totalSec < 0) return "0:00";
  const sec = Math.floor(totalSec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function FilmRoomVideoControlDock({
  playing,
  currentTime,
  duration,
  markerTimes,
  eventMarkerTimes = [],
  fullscreen,
  autoClearOnScrub,
  onToggleAutoClear,
  onTogglePlay,
  onSeek,
  onToggleFullscreen,
}: Props) {
  const scrubDisabled = duration <= 0;

  return (
    <div className="fc-film-video-controls-dim" aria-label="Video playback controls">
      <button
        type="button"
        className={`fc-film-video-controls-autoclear${autoClearOnScrub ? " is-active" : ""}`}
        onClick={onToggleAutoClear}
        title="Auto clear drawings when scrubbing"
        aria-label="Auto clear on scrub"
        aria-pressed={autoClearOnScrub}
      >
        AC
      </button>
      <button
        type="button"
        className="fc-film-video-controls-play"
        onClick={onTogglePlay}
        title={playing ? "Pause" : "Play"}
        aria-label={playing ? "Pause video" : "Play video"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <span className="fc-film-video-controls-time">{formatClock(currentTime)}</span>
      <div className="fc-film-video-controls-track-wrap">
        <input
          type="range"
          className="fc-film-video-controls-scrub"
          min={0}
          max={Math.max(duration, 0.01)}
          step={0.05}
          value={Math.min(currentTime, duration || 0)}
          disabled={scrubDisabled}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Scrub video"
        />
        <div className="fc-film-video-controls-markers" aria-hidden="true">
          {eventMarkerTimes.map((marker) => {
            const pct = duration > 0 ? (marker.time / duration) * 100 : 0;
            return (
              <span
                key={marker.id}
                className="fc-film-video-controls-marker is-event"
                style={{ left: `${pct}%` }}
              />
            );
          })}
          {markerTimes.map((time) => {
            const pct = duration > 0 ? (time / duration) * 100 : 0;
            return (
              <span
                key={`ink-${time}`}
                className="fc-film-video-controls-marker"
                style={{ left: `${pct}%` }}
              />
            );
          })}
        </div>
      </div>
      <span className="fc-film-video-controls-time">{formatClock(duration)}</span>
      <button
        type="button"
        className="fc-film-video-controls-fullscreen"
        onClick={(e) => {
          onToggleFullscreen();
          (e.currentTarget as HTMLButtonElement).blur();
        }}
        title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        aria-pressed={fullscreen}
      >
        {fullscreen ? "⤢" : "⛶"}
      </button>
    </div>
  );
}
