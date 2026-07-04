"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildPossessionPlaylist,
  nextPossessionPlaylistIndex,
  possessionPlaylistIndexAtTime,
  prevPossessionPlaylistIndex,
  type PossessionPlaylistFilter,
  type PossessionPlaylistItem,
} from "@/lib/film-room/film-possession-playlist";
import type { FilmRoomBookmark } from "@/types/film-room";

interface Props {
  bookmarks: FilmRoomBookmark[];
  currentTime: number;
  disabled?: boolean;
  onSeek: (time: number) => void;
  onPlay?: () => void;
}

export function FilmRoomPossessionPlaylist({
  bookmarks,
  currentTime,
  disabled = false,
  onSeek,
  onPlay,
}: Props) {
  const [filter, setFilter] = useState<PossessionPlaylistFilter>("all");
  const items = useMemo(
    () => buildPossessionPlaylist(bookmarks, filter),
    [bookmarks, filter],
  );
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!items.length) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(possessionPlaylistIndexAtTime(items, currentTime));
  }, [currentTime, items]);

  function seekToItem(item: PossessionPlaylistItem, index: number) {
    setActiveIndex(index);
    onSeek(item.time);
    onPlay?.();
  }

  function goNext() {
    const next = nextPossessionPlaylistIndex(items, activeIndex);
    if (next < 0 || !items[next]) return;
    seekToItem(items[next], next);
  }

  function goPrev() {
    const prev = prevPossessionPlaylistIndex(items, activeIndex);
    if (prev < 0 || !items[prev]) return;
    seekToItem(items[prev], prev);
  }

  function startPlaylist() {
    if (!items[0]) return;
    seekToItem(items[0], 0);
  }

  if (!bookmarks.length) return null;

  return (
    <section className="fc-film-possession-playlist" aria-label="Possession playlist">
      <div className="fc-film-possession-playlist-head">
        <h4 className="fc-film-possession-playlist-title">Possession playlist</h4>
        <div className="fc-film-possession-playlist-filters">
          {(
            [
              ["all", "All"],
              ["disruption", "Disruptions"],
              ["chapter", "Chapters"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`fc-film-possession-playlist-filter${filter === value ? " is-active" : ""}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="fc-film-possession-playlist-actions">
        <button
          type="button"
          className="fc-film-possession-playlist-btn"
          disabled={disabled || !items.length}
          onClick={startPlaylist}
        >
          Start
        </button>
        <button
          type="button"
          className="fc-film-possession-playlist-btn secondary"
          disabled={disabled || !items.length}
          onClick={goPrev}
        >
          Prev
        </button>
        <button
          type="button"
          className="fc-film-possession-playlist-btn secondary"
          disabled={disabled || !items.length}
          onClick={goNext}
        >
          Next possession
        </button>
        <span className="fc-film-possession-playlist-count">
          {items.length} clip{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {items.length ? (
        <ol className="fc-film-possession-playlist-list">
          {items.map((item, index) => (
            <li
              key={item.bookmarkId}
              className={`fc-film-possession-playlist-item${index === activeIndex ? " is-active" : ""}${item.kind === "disruption" ? " is-disruption" : ""}`}
            >
              <button
                type="button"
                className="fc-film-possession-playlist-item-btn"
                disabled={disabled}
                onClick={() => seekToItem(item, index)}
              >
                <span className="fc-film-possession-playlist-time">
                  {item.timeLabel || "0:00"}
                </span>
                <span className="fc-film-possession-playlist-label">{item.label}</span>
                {item.kind === "disruption" ? (
                  <span className="fc-film-possession-playlist-badge">Disruption</span>
                ) : null}
                {item.note ? (
                  <span className="fc-film-possession-playlist-note">{item.note}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="fc-film-possession-playlist-empty">
          No bookmarks match this filter — add chapters or mark where the plan broke.
        </p>
      )}
    </section>
  );
}
