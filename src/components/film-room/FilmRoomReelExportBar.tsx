"use client";

import { useMemo, useState } from "react";
import {
  buildPossessionReelManifest,
  downloadTextFile,
  formatPossessionReelCutList,
  formatPossessionReelMarkdown,
  type PossessionReelSegment,
} from "@/lib/film-room/possession-reel-export";
import {
  buildPossessionPlaylist,
  type PossessionPlaylistFilter,
} from "@/lib/film-room/film-possession-playlist";
import { appNotice } from "@/stores/dialog-store";
import type { FilmRoomBookmark, FilmRoomVideoSource } from "@/types/film-room";

interface Props {
  sessionId: string;
  sessionTitle: string;
  source: FilmRoomVideoSource;
  bookmarks: FilmRoomBookmark[];
  videoDuration: number;
  filter: PossessionPlaylistFilter;
  reelActive: boolean;
  reelIndex: number;
  onStartReel: (segments: PossessionReelSegment[]) => void;
  onStopReel: () => void;
}

export function FilmRoomReelExportBar({
  sessionId,
  sessionTitle,
  source,
  bookmarks,
  videoDuration,
  filter,
  reelActive,
  reelIndex,
  onStartReel,
  onStopReel,
}: Props) {
  const [busy, setBusy] = useState(false);
  const items = useMemo(
    () => buildPossessionPlaylist(bookmarks, filter),
    [bookmarks, filter],
  );

  const manifest = useMemo(
    () =>
      buildPossessionReelManifest({
        sessionId,
        sessionTitle,
        source,
        origin: typeof window !== "undefined" ? window.location.origin : "",
        items,
        videoDuration,
      }),
    [sessionId, sessionTitle, source, items, videoDuration],
  );

  if (!items.length) return null;

  function exportJson() {
    downloadTextFile(
      `${slugify(sessionTitle)}-reel.json`,
      JSON.stringify(manifest, null, 2),
      "application/json;charset=utf-8",
    );
  }

  function exportCutList() {
    downloadTextFile(
      `${slugify(sessionTitle)}-reel.txt`,
      formatPossessionReelCutList(manifest),
    );
  }

  async function copyMarkdown() {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(formatPossessionReelMarkdown(manifest));
      appNotice("Reel copied", "Markdown table copied to clipboard.");
    } catch {
      appNotice("Copy failed", "Could not copy reel to clipboard.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fc-film-reel-export" aria-label="Possession reel export">
      <span className="fc-film-reel-export-label">Reel export</span>
      <div className="fc-film-reel-export-actions">
        {!reelActive ? (
          <button
            type="button"
            className="fc-film-reel-export-btn primary"
            onClick={() => onStartReel(manifest.segments)}
          >
            Play reel ({manifest.segmentCount})
          </button>
        ) : (
          <button
            type="button"
            className="fc-film-reel-export-btn"
            onClick={onStopReel}
          >
            Stop reel · {reelIndex + 1}/{manifest.segmentCount}
          </button>
        )}
        <button
          type="button"
          className="fc-film-reel-export-btn"
          disabled={busy}
          onClick={exportCutList}
        >
          Cut list
        </button>
        <button type="button" className="fc-film-reel-export-btn" onClick={exportJson}>
          JSON
        </button>
        <button
          type="button"
          className="fc-film-reel-export-btn"
          disabled={busy}
          onClick={() => void copyMarkdown()}
        >
          Copy MD
        </button>
      </div>
      {source.kind === "upload" ? (
        <p className="fc-film-reel-export-hint">
          Upload sessions: deep links work in FastCourt; use cut list for external editors.
        </p>
      ) : null}
    </div>
  );
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "film-session"
  );
}
