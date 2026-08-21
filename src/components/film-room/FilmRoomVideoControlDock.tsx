"use client";

interface Props {
  playing: boolean;
  currentTime: number;
  duration: number;
  markerTimes: Array<{ id: string; time: number }>;
  eventMarkerTimes?: Array<{ id: string; time: number }>;
  disruptionMarkerTimes?: Array<{ id: string; time: number }>;
  bookmarkMarkerTimes?: Array<{ id: string; time: number; kind?: string }>;
  fullscreen: boolean;
  allowFullscreen?: boolean;
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
  disruptionMarkerTimes = [],
  bookmarkMarkerTimes = [],
  fullscreen,
  allowFullscreen = true,
  autoClearOnScrub,
  onToggleAutoClear,
  onTogglePlay,
  onSeek,
  onToggleFullscreen,
}: Props) {
  const scrubDisabled = duration <= 0;

  function renderMarker(
    marker: { id: string; time: number; kind?: string },
    className: string,
    label: string,
  ) {
    const pct = duration > 0 ? (marker.time / duration) * 100 : 0;
    return (
      <button
        key={marker.id}
        type="button"
        className={`fc-film-video-controls-marker ${className}`}
        style={{ left: `${pct}%` }}
        title={`${label} · ${formatClock(marker.time)}`}
        aria-label={`Seek to ${label} at ${formatClock(marker.time)}`}
        disabled={scrubDisabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSeek(marker.time);
        }}
      />
    );
  }

  return (
    <div className="fc-film-video-controls-dim" aria-label="Video playback controls">
      <button
        type="button"
        className={`fc-film-video-controls-autoclear${autoClearOnScrub ? " is-active" : ""}`}
        onClick={onToggleAutoClear}
        title="Auto-clear drawings when scrubbing"
        aria-label="Auto-clear drawings when scrubbing"
        aria-pressed={autoClearOnScrub}
      >
        Clear
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
        <div className="fc-film-video-controls-markers">
          {bookmarkMarkerTimes.map((marker) =>
            renderMarker(
              marker,
              marker.kind === "disruption" ? "is-disruption-break" : "is-bookmark",
              marker.kind === "disruption" ? "Plan break" : "Chapter",
            ),
          )}
          {disruptionMarkerTimes.map((marker) =>
            renderMarker(marker, "is-disruption", "Disruption"),
          )}
          {eventMarkerTimes.map((marker) =>
            renderMarker(marker, "is-event", "Event"),
          )}
          {markerTimes.map((marker) =>
            renderMarker(marker, "", "Drawing"),
          )}
        </div>
      </div>
      <span className="fc-film-video-controls-time">{formatClock(duration)}</span>
      {allowFullscreen ? (
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
      ) : null}
    </div>
  );
}
