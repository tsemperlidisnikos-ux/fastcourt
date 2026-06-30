"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { gamePlanCategoryLabel } from "@/lib/game-plan/constants";
import { formatHomeworkDueDate } from "@/lib/game-plan/player-homework";
import { queueHomeworkAck } from "@/lib/game-plan/player-homework-ack";
import { formatGamePlanDate } from "@/lib/game-plan/game-plan-items";
import {
  buildHomeworkAckUrl,
  shareMinifiedToStoredPlay,
} from "@/lib/share/share-link";
import { appNotice } from "@/stores/dialog-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { useShareStore } from "@/stores/share-store";
import type { StoredPlay } from "@/types/library";
import "@/styles/player-share.css";
import "@/styles/fc-game-plan-share.css";

export function HomeworkShareOverlay() {
  const session = useShareStore((s) => s.homeworkShareSession);
  const clearHomeworkShareSession = useShareStore((s) => s.clearHomeworkShareSession);
  const applyPlayerHomeworkAck = useOrganizerStore((s) => s.applyPlayerHomeworkAck);
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);
  const [markedStudied, setMarkedStudied] = useState(false);
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

  useEffect(() => {
    if (!session?.homeworkId || !session.player) return;
    const event = {
      homeworkId: session.homeworkId,
      playerId: session.player.id,
      token: session.player.token,
      type: "open" as const,
      at: new Date().toISOString(),
      playerName: session.player.name,
    };
    queueHomeworkAck(event);
    void applyPlayerHomeworkAck(
      event.homeworkId,
      event.playerId,
      event.token,
      event.type,
    );
  }, [applyPlayerHomeworkAck, session]);

  if (!session || !mounted) return null;

  const metaParts = [
    `Due ${formatHomeworkDueDate(session.assignment.dueDate)}`,
    `Game ${formatGamePlanDate(session.assignment.gameDate)}`,
    session.assignment.team,
    `${session.entries.length} plays`,
  ].filter(Boolean);

  async function handleMarkStudied() {
    if (!session?.homeworkId || !session.player || markedStudied) return;
    const event = {
      homeworkId: session.homeworkId,
      playerId: session.player.id,
      token: session.player.token,
      type: "studied" as const,
      at: new Date().toISOString(),
      playerName: session.player.name,
    };
    queueHomeworkAck(event);
    await applyPlayerHomeworkAck(
      event.homeworkId,
      event.playerId,
      event.token,
      event.type,
    );
    const ackUrl = buildHomeworkAckUrl(
      event.homeworkId,
      event.playerId,
      event.token,
      "studied",
      session.player.name,
    );
    try {
      await navigator.clipboard.writeText(ackUrl);
      appNotice(
        "Studied",
        "Marked as studied. A coach confirmation link was copied — paste it in your team chat if needed.",
      );
    } catch {
      appNotice("Studied", "Marked as studied. Tell your coach you finished.");
    }
    setMarkedStudied(true);
  }

  return createPortal(
    <>
      <div className="game-plan-share-overlay homework-share-overlay" id="homework-share-overlay">
        <header className="game-plan-share-header">
          <div className="game-plan-share-badge homework-share-badge">Player homework</div>
          <h1 className="game-plan-share-title">{session.assignment.title}</h1>
          <p className="game-plan-share-meta">{metaParts.join(" · ")}</p>
          {session.player?.name ? (
            <p className="homework-share-player-banner">
              Assigned to <strong>{session.player.name}</strong>
            </p>
          ) : null}
          {session.assignment.notes?.trim() ? (
            <p className="game-plan-share-notes">{session.assignment.notes}</p>
          ) : null}
          <p className="homework-share-instruction">
            Open each play and study the sets before game day.
          </p>
          {session.player ? (
            markedStudied ? (
              <p className="homework-share-studied-done">Marked as studied. See you at practice.</p>
            ) : (
              <button
                type="button"
                className="homework-share-studied-btn"
                onClick={() => void handleMarkStudied()}
              >
                Mark as studied
              </button>
            )
          ) : null}
          <button
            type="button"
            className="practice-close-btn"
            onClick={clearHomeworkShareSession}
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
                          Study play
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
