"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { useClientMounted } from "@/hooks/useClientMounted";
import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import { useShareStore } from "@/stores/share-store";

export function FilmReelShareOverlay() {
  const session = useShareStore((s) => s.filmReelShareSession);
  const clearFilmReelShareSession = useShareStore((s) => s.clearFilmReelShareSession);
  const mounted = useClientMounted();

  if (!session || !mounted) return null;

  return createPortal(
    <div className="film-reel-share-overlay" id="film-reel-share-overlay">
      <header className="film-reel-share-header">
        <div className="film-reel-share-badge">Possession reel</div>
        <h1 className="film-reel-share-title">{session.session.title || "Film session"}</h1>
        <p className="film-reel-share-meta">
          {session.segments.length} clips · {session.session.sourceKind}
        </p>
        <Link
          href={buildFilmRoomDeepLink(session.sessionId)}
          className="film-reel-share-session-link"
        >
          Open full session in Film Room ↗
        </Link>
      </header>
      <ol className="film-reel-share-list">
        {session.segments.map((segment, index) => (
          <li key={`${segment.path}-${index}`} className="film-reel-share-row">
            <span className="film-reel-share-num">{index + 1}</span>
            <div className="film-reel-share-main">
              <strong>
                {segment.timeLabel} · {segment.label}
              </strong>
              <p className="film-reel-share-range">
                {segment.startSec.toFixed(1)}s → {segment.endSec.toFixed(1)}s
              </p>
              {segment.note ? (
                <p className="film-reel-share-note">{segment.note}</p>
              ) : null}
              <Link href={segment.path} className="film-reel-share-clip-link">
                Watch clip ↗
              </Link>
            </div>
          </li>
        ))}
      </ol>
      <footer className="film-reel-share-foot">
        <button type="button" className="film-reel-share-close" onClick={clearFilmReelShareSession}>
          Close
        </button>
      </footer>
    </div>,
    document.body,
  );
}
