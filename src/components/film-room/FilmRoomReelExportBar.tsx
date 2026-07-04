"use client";

import { useMemo, useState } from "react";
import {
  buildPossessionReelManifest,
  downloadTextFile,
  formatPossessionReelCutList,
  formatPossessionReelMarkdown,
  type PossessionReelSegment,
} from "@/lib/film-room/possession-reel-export";
import { buildStandaloneReelHtml } from "@/lib/film-room/film-reel-html-export";
import { buildFilmReelShareUrl } from "@/lib/film-room/film-reel-share";
import {
  downloadBlobFile,
  exportUploadReelMp4,
  type ReelMp4Progress,
} from "@/lib/film-room/film-reel-mp4-export";
import {
  buildPossessionPlaylist,
  type PossessionPlaylistFilter,
} from "@/lib/film-room/film-possession-playlist";
import { copyShareResult } from "@/lib/share/share-link";
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
  getUploadBlob?: () => Promise<Blob | null>;
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
  getUploadBlob,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [mp4Progress, setMp4Progress] = useState<ReelMp4Progress | null>(null);
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

  function exportHtml() {
    downloadTextFile(
      `${slugify(sessionTitle)}-reel.html`,
      buildStandaloneReelHtml(manifest),
      "text/html;charset=utf-8",
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

  async function shareStaffLink() {
    const result = buildFilmReelShareUrl(manifest);
    await copyShareResult(result, "Staff reel link");
  }

  async function exportMp4() {
    if (source.kind !== "upload" || !getUploadBlob) {
      appNotice(
        "MP4 export",
        "Stitched MP4 is available for uploaded video files only.",
      );
      return;
    }
    setBusy(true);
    setMp4Progress({
      phase: "loading",
      current: 0,
      total: manifest.segmentCount,
      message: "Preparing export…",
    });
    try {
      const file = await getUploadBlob();
      if (!file) {
        throw new Error("Uploaded video file is not available on this device.");
      }
      const output = await exportUploadReelMp4(
        file,
        manifest.segments,
        setMp4Progress,
      );
      downloadBlobFile(`${slugify(sessionTitle)}-reel.mp4`, output);
      appNotice("MP4 exported", "Possession reel saved to downloads.");
    } catch (err) {
      appNotice(
        "MP4 export failed",
        err instanceof Error ? err.message : "Could not stitch reel.",
      );
    } finally {
      setBusy(false);
      setMp4Progress(null);
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
          onClick={() => void shareStaffLink()}
        >
          Share staff
        </button>
        <button
          type="button"
          className="fc-film-reel-export-btn"
          disabled={busy}
          onClick={exportHtml}
        >
          HTML
        </button>
        {source.kind === "upload" ? (
          <button
            type="button"
            className="fc-film-reel-export-btn"
            disabled={busy}
            onClick={() => void exportMp4()}
          >
            MP4
          </button>
        ) : null}
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
      {mp4Progress ? (
        <p className="fc-film-reel-export-progress">{mp4Progress.message}</p>
      ) : null}
      {source.kind === "upload" ? (
        <p className="fc-film-reel-export-hint">
          Upload sessions: MP4 stitch runs locally in your browser.
        </p>
      ) : (
        <p className="fc-film-reel-export-hint">
          YouTube/direct: use staff share link or HTML export with deep links.
        </p>
      )}
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
