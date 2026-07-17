"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { PrintPreviewIcon } from "@/components/library/PrintPreviewIcon";
import { mergeCourtViewSettings } from "@/lib/designer/court-view-settings";
import { getLibraryPreviewThumbSize } from "@/lib/library/library-preview-thumb-size";
import { canInlineEmbedVideo } from "@/lib/library/video-url";
import { VideoEmbed } from "@/components/library/VideoEmbed";
import { VideoWatchButton } from "@/components/library/VideoWatchButton";
import type { StoredPlay } from "@/types/library";
import {
  findSimilarPlays,
  formatSimilarityScore,
} from "@/lib/library/play-dna";
import {
  formatCounterLibraryBadgeLabel,
  formatCounterLibraryBadgeTitle,
  isCounterLibraryItem,
} from "@/lib/library/counter-library-badge";

const CourtFrameThumbnail = dynamic(
  () =>
    import("@/components/designer/CourtFrameThumbnail").then(
      (m) => m.CourtFrameThumbnail,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="org-preview-frame-thumb-placeholder">Rendering…</div>
    ),
  },
);

interface Props {
  play: StoredPlay | null;
  libraryPlays?: StoredPlay[];
  onSelectPlay?: (playId: string) => void;
  onEditDetails?: () => void;
  onDuplicate?: () => void;
  onAddToPlaybook?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onSendToPlayers?: () => void;
  onPresent?: () => void;
  onTogglePin?: () => void;
}

const PREVIEW_FRAME_LIMIT = 12;

function frameLabel(frame: StoredPlay["frames"][number], index: number) {
  const raw = frame.name?.trim();
  if (raw && /^frame\s*\d+/i.test(raw)) return raw.toUpperCase();
  if (raw && !/^frame$/i.test(raw)) return raw.toUpperCase();
  return `FRAME ${index + 1}`;
}

function frameCountLabel(count: number) {
  return count === 1 ? "1 frame" : `${count} frames`;
}

export function LibraryPreviewPanel({
  play,
  libraryPlays = [],
  onSelectPlay,
  onEditDetails,
  onDuplicate,
  onAddToPlaybook,
  onPrint,
  onShare,
  onSendToPlayers,
  onPresent,
  onTogglePin,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  const similarPlays = useMemo(() => {
    if (!play || libraryPlays.length < 2) return [];
    return findSimilarPlays(play, libraryPlays, { limit: 3 });
  }, [libraryPlays, play]);

  useEffect(() => {
    const split = document.getElementById("org-library-split");
    if (!split) return;
    if (fullscreen) split.classList.add("fc-laptop-preview-fullscreen");
    else split.classList.remove("fc-laptop-preview-fullscreen");
    return () => split.classList.remove("fc-laptop-preview-fullscreen");
  }, [fullscreen]);

  useLayoutEffect(() => {
    if (!play) return;
    const grid = document.getElementById("library-preview-content");
    if (!grid) return;

    const applyThumbSize = () => {
      const courtTemplate = mergeCourtViewSettings(play.courtView).template;
      const size = getLibraryPreviewThumbSize(
        grid.clientWidth,
        play.courtType,
        undefined,
        courtTemplate,
      );
      grid.style.setProperty("--fc-lib-preview-col-w", `${size.columnWidth}px`);
      grid.style.setProperty("--fc-lib-preview-thumb-w", `${size.thumbWidth}px`);
      grid.style.setProperty("--fc-lib-preview-thumb-h", `${size.thumbHeight}px`);
    };

    applyThumbSize();
    const ro = new ResizeObserver(applyThumbSize);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [play]);

  if (!play) {
    return (
      <aside
        className="org-library-preview fd-preview-panel"
        id="library-preview-panel"
      >
        <div className="library-preview-view fd-preview-view" id="library-preview-view">
          <div
            className="fd-preview-actions-bar org-preview-header"
            id="fd-preview-actions-bar"
            hidden
          />
          <div className="fd-preview-subbar" id="fd-preview-subbar" hidden />
          <div
            className="org-preview-toolbar fd-preview-toolbar"
            id="fd-preview-toolbar"
            hidden
          />
          <div
            className="org-preview-frames fd-preview-content"
            id="library-preview-content"
          >
            <div className="org-preview-empty-state">
              <div className="org-preview-empty-title">No Play Selected</div>
              <p className="org-preview-empty-text">
                Select a play from the list, or start a new diagram.
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const previewFrames = play.frames.slice(0, PREVIEW_FRAME_LIMIT);
  const hasMore = play.frames.length > PREVIEW_FRAME_LIMIT;
  const breadcrumb = [play.season, play.team, play.series, play.title]
    .filter(Boolean)
    .join(" • ");

  return (
    <aside
      className="org-library-preview fd-preview-panel"
      id="library-preview-panel"
    >
      <div className="library-preview-view fd-preview-view" id="library-preview-view">
        <div
          className="fd-preview-actions-bar org-preview-header"
          id="fd-preview-actions-bar"
        >
          <div className="org-preview-meta">
            <div className="org-preview-breadcrumb" id="library-preview-breadcrumb">
              {breadcrumb}
              {isCounterLibraryItem(play) && play.defenseCounter ? (
                <span
                  className="fd-counter-badge fd-counter-badge-preview"
                  title={formatCounterLibraryBadgeTitle(play.defenseCounter)}
                >
                  {formatCounterLibraryBadgeLabel(play.defenseCounter)}
                </span>
              ) : null}
            </div>
            <div className="org-preview-sub" id="library-preview-sub" />
          </div>
          <div className="org-preview-actions">
            <Link
              href={`/designer?item=${play.id}`}
              className="fd-preview-open-btn org-preview-edit-btn org-preview-edit-btn-primary"
              id="btn-library-edit-play"
            >
              Edit Play
            </Link>
            <button
              type="button"
              className="org-preview-edit-btn fd-preview-extra-action"
              id="btn-library-edit-details"
              title="Edit details"
              onClick={onEditDetails}
            >
              Details
            </button>
            <button
              type="button"
              className="org-preview-duplicate-btn fd-preview-extra-action"
              id="btn-library-duplicate-play"
              onClick={onDuplicate}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="org-preview-add-playbook-btn fd-preview-extra-action"
              id="btn-library-add-to-playbook"
              onClick={onAddToPlaybook}
            >
              Add to Playbook
            </button>
          </div>
          <div
            className="fc-laptop-preview-header-controls"
            id="fc-laptop-preview-header-controls"
          >
            <button
              type="button"
              className="fc-laptop-preview-fs-btn"
              id="btn-laptop-preview-fullscreen"
              title="Fullscreen preview"
              aria-label="Fullscreen"
              onClick={() => setFullscreen((v) => !v)}
            >
              {fullscreen ? "⤢" : "⛶"}
            </button>
          </div>
          <button
            type="button"
            className="fc-preview-header-print-btn fc-preview-header-print-play"
            id="btn-play-preview-header-print"
            title="Print / preview layout"
            aria-label="Print preview"
            onClick={onPrint}
          >
            <PrintPreviewIcon size={20} />
          </button>
        </div>

        <div className="fd-preview-subbar" id="fd-preview-subbar">
          <button
            type="button"
            className="fd-preview-subbar-btn"
            id="btn-laptop-preview-details"
            title="Edit details"
            aria-label="Edit details"
            onClick={onEditDetails}
          >
            ✎
          </button>
          <button
            type="button"
            className="fd-preview-subbar-btn"
            id="btn-laptop-preview-share"
            title="Share play"
            aria-label="Share"
            onClick={onShare}
          >
            ⎘
          </button>
          {onSendToPlayers ? (
            <button
              type="button"
              className="fd-preview-subbar-btn"
              id="btn-laptop-preview-send-players"
              title="Send to players"
              aria-label="Send to players"
              onClick={onSendToPlayers}
            >
              👥
            </button>
          ) : null}
        </div>

        <div
          className="org-preview-toolbar fd-preview-toolbar"
          id="fd-preview-toolbar"
        >
          <span id="library-preview-frame-count">
            {frameCountLabel(play.frames.length)}
          </span>
          <button
            type="button"
            className="org-preview-tool-btn org-preview-present-btn"
            id="btn-library-present-play"
            title="Present play"
            onClick={onPresent}
          >
            ▶
          </button>
          {play.videoUrl ? (
            <VideoWatchButton
              videoUrl={play.videoUrl}
              title={play.title}
              className="org-preview-tool-btn org-preview-video-btn"
              id="btn-library-video-play"
              titleAttr="Watch video"
              label="▶"
            />
          ) : null}
          <button
            type="button"
            className="org-preview-tool-btn org-preview-pin-btn"
            id="btn-library-pin-play"
            title="Pin"
            onClick={onTogglePin}
          >
            {play.favorite ? "★ Pin" : "☆ Pin"}
          </button>
          <button
            type="button"
            className="org-preview-tool-btn org-preview-print-btn"
            id="btn-library-print-play"
            title="Print / preview layout"
            onClick={onPrint}
          >
            🖶
          </button>
          <button
            type="button"
            className="org-preview-tool-btn"
            id="btn-library-share-play"
            title="Share"
            onClick={onShare}
          >
            🔗
          </button>
          {onSendToPlayers ? (
            <button
              type="button"
              className="org-preview-tool-btn"
              id="btn-library-send-players"
              title="Send to players"
              onClick={onSendToPlayers}
            >
              👥
            </button>
          ) : null}
        </div>

        {play.playNotes ? (
          <div className="org-preview-play-notes" id="library-preview-play-notes">
            <span className="org-preview-play-notes-icon" aria-hidden="true">
              ✎
            </span>
            <div
              className="org-preview-play-notes-body"
              dangerouslySetInnerHTML={{ __html: play.playNotes }}
            />
          </div>
        ) : null}

        {play.videoUrl && canInlineEmbedVideo(play.videoUrl) ? (
          <div className="org-preview-video-embed" id="library-preview-video-embed">
            <VideoEmbed videoUrl={play.videoUrl} title={play.title} compact />
          </div>
        ) : null}

        {similarPlays.length ? (
          <section className="fc-play-dna-panel" aria-label="Similar plays">
            <h3 className="fc-play-dna-title">Similar plays</h3>
            <ul className="fc-play-dna-list">
              {similarPlays.map(({ play: match, score }) => (
                <li key={match.id}>
                  <button
                    type="button"
                    className="fc-play-dna-item"
                    onClick={() => onSelectPlay?.(match.id)}
                  >
                    <span className="fc-play-dna-item-title">{match.title}</span>
                    <span className="fc-play-dna-item-score">
                      {formatSimilarityScore(score)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div
          className="org-preview-frames fd-preview-content fc-lib-preview-frames-grid"
          id="library-preview-content"
        >
          {hasMore ? (
            <div className="org-preview-frame-limit-notice">
              Showing first {PREVIEW_FRAME_LIMIT} of {play.frames.length} frames.
              Open editor to view all.
            </div>
          ) : null}
          {previewFrames.map((frame, index) => {
            const notesText = frame.notes?.replace(/<[^>]+>/g, "").trim();
            return (
              <div
                key={frame.id}
                className="org-preview-frame-card"
                data-frame-index={index}
              >
                <div className="org-preview-frame-title">
                  {frameLabel(frame, index)}
                </div>
                <div className="org-preview-frame-court">
                  <CourtFrameThumbnail
                    courtType={play.courtType}
                    frame={frame}
                    size="sm"
                    alt={frameLabel(frame, index)}
                    courtView={play.courtView}
                  />
                </div>
                {notesText ? (
                  <div className="org-preview-frame-notes">{notesText}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
