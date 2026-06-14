"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { shareMinifiedToStoredPlay } from "@/lib/share/share-link";
import { useShareStore } from "@/stores/share-store";
import type { StoredPlay } from "@/types/library";
import "@/styles/player-share.css";

function formatPracticeDate(date: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function PracticeShareOverlay() {
  const session = useShareStore((s) => s.practiceShareSession);
  const clearPracticeShareSession = useShareStore(
    (s) => s.clearPracticeShareSession,
  );
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);
  const mounted = useClientMounted();

  const totalMin = useMemo(
    () =>
      session?.items.reduce((sum, item) => sum + (Number(item.durationMin) || 0), 0) ??
      0,
    [session],
  );

  if (!session || !mounted) return null;

  const metaParts = [
    formatPracticeDate(session.session.date),
    session.session.team,
    `${session.items.length} blocks`,
    `${totalMin} min`,
  ].filter(Boolean);

  return createPortal(
    <>
      <div className="practice-share-overlay" id="practice-share-overlay">
        <header className="practice-share-header">
          <div className="practice-share-badge">Practice plan</div>
          <h1 className="practice-share-title" id="practice-share-title">
            {session.session.title || "Practice"}
          </h1>
          <p className="practice-share-meta" id="practice-share-meta">
            {metaParts.join(" · ")}
          </p>
          {session.session.notes?.trim() ? (
            <p className="practice-share-notes" id="practice-share-notes">
              {session.session.notes}
            </p>
          ) : null}
          <button
            type="button"
            className="practice-close-btn"
            id="practice-share-close"
            style={{ marginTop: 16 }}
            onClick={clearPracticeShareSession}
          >
            ✕ Close
          </button>
        </header>
        <div className="practice-share-body" id="practice-share-list">
          {session.items.map((entry, index) => {
            const play = entry.play
              ? shareMinifiedToStoredPlay(entry.play, index)
              : null;
            const name = play?.title || entry.cueLabel || `Block ${index + 1}`;
            const kind = play?.type === "drill" ? "Drill" : play ? "Play" : "Block";
            return (
              <article key={index} className="practice-share-card">
                <div className="practice-share-card-num">{index + 1}</div>
                <div className="practice-share-card-thumb">
                  {play?.frames?.[0] ? (
                    <CourtFrameThumbnail
                      frame={play.frames[0]}
                      courtType={play.courtType}
                      size="sm"
                    />
                  ) : (
                    <span>{play ? "🏀" : "📋"}</span>
                  )}
                </div>
                <div className="practice-share-card-main">
                  <div className="practice-share-card-name">{name}</div>
                  <div className="practice-share-card-meta">
                    {kind} · {Number(entry.durationMin) || 0} min
                  </div>
                  {entry.notes ? (
                    <div className="practice-share-card-cue">{entry.notes}</div>
                  ) : null}
                  <div className="practice-share-card-actions">
                    {play?.frames?.length ? (
                      <button
                        type="button"
                        className="practice-share-action-btn"
                        onClick={() => setPresentPlay(play)}
                      >
                        View diagram
                      </button>
                    ) : null}
                    {entry.videoUrl ? (
                      <a
                        className="practice-share-action-btn practice-share-action-link"
                        href={entry.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ▶ Watch video
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {presentPlay ? (
        <PresentationOverlay
          play={presentPlay}
          onClose={() => setPresentPlay(null)}
        />
      ) : null}
    </>,
    document.body,
  );
}
