"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { gamePlanCategoryLabel } from "@/lib/game-plan/constants";
import { formatGamePlanDate, formatGamePlanHomeAway } from "@/lib/game-plan/game-plan-items";
import { shareMinifiedToStoredPlay } from "@/lib/share/share-link";
import { useShareStore } from "@/stores/share-store";
import type { StoredPlay } from "@/types/library";
import "@/styles/player-share.css";
import "@/styles/fc-game-plan-share.css";

export function GamePlanShareOverlay() {
  const session = useShareStore((s) => s.gamePlanShareSession);
  const clearGamePlanShareSession = useShareStore((s) => s.clearGamePlanShareSession);
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);
  const mounted = useClientMounted();

  const grouped = useMemo(() => {
    if (!session) return [];
    const map = new Map<string, typeof session.entries>();
    for (const entry of session.entries) {
      const label =
        entry.categoryLabel?.trim() ||
        gamePlanCategoryLabel(entry.categoryId, entry.categoryLabel);
      const list = map.get(label) || [];
      list.push(entry);
      map.set(label, list);
    }
    return [...map.entries()].map(([label, entries]) => ({ label, entries }));
  }, [session]);

  if (!session || !mounted) return null;

  const metaParts = [
    formatGamePlanDate(session.plan.gameDate),
    formatGamePlanHomeAway(session.plan.homeAway as "home" | "away" | "neutral" | undefined),
    session.plan.team,
    session.plan.location,
    `${session.entries.length} plays`,
  ].filter(Boolean);

  return createPortal(
    <>
      <div className="game-plan-share-overlay" id="game-plan-share-overlay">
        <header className="game-plan-share-header">
          <div className="game-plan-share-badge">Game plan</div>
          <h1 className="game-plan-share-title">{session.plan.title}</h1>
          <p className="game-plan-share-meta">{metaParts.join(" · ")}</p>
          {session.plan.scoutingNotes?.trim() ? (
            <p className="game-plan-share-notes">{session.plan.scoutingNotes}</p>
          ) : null}
          {session.plan.postGameNotes?.trim() ? (
            <p className="game-plan-share-notes game-plan-share-postgame">
              <strong>Post-game:</strong> {session.plan.postGameNotes}
            </p>
          ) : null}
          <button
            type="button"
            className="practice-close-btn"
            onClick={clearGamePlanShareSession}
          >
            ✕ Close
          </button>
        </header>
        <div className="game-plan-share-body">
          {grouped.map((group) => (
            <section key={group.label} className="game-plan-share-category">
              <h2 className="game-plan-share-category-title">{group.label}</h2>
              <ul className="game-plan-share-call-list">
                {group.entries.map((entry, index) => {
                  const play = entry.play
                    ? shareMinifiedToStoredPlay(entry.play, index)
                    : null;
                  const name =
                    entry.callName?.trim() ||
                    play?.title ||
                    `Play ${index + 1}`;
                  return (
                    <li key={`${group.label}-${index}`} className="game-plan-share-call-row">
                      <div className="game-plan-share-call-main">
                        <span className="game-plan-share-call-name">{name}</span>
                        {entry.notes?.trim() ? (
                          <span className="game-plan-share-call-note">{entry.notes}</span>
                        ) : null}
                      </div>
                      {play?.frames?.length ? (
                        <button
                          type="button"
                          className="practice-share-action-btn"
                          onClick={() => setPresentPlay(play)}
                        >
                          View diagram
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
      {presentPlay ? (
        <PresentationOverlay play={presentPlay} onClose={() => setPresentPlay(null)} />
      ) : null}
    </>,
    document.body,
  );
}
