"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  buildGameDayCategoriesFromShareEntries,
} from "@/lib/game-plan/game-day";
import { useSyncedGameDayIndex } from "@/components/library/GameDayOverlay";
import { formatGamePlanDate, formatGamePlanHomeAway } from "@/lib/game-plan/game-plan-items";
import { useShareStore } from "@/stores/share-store";
import "@/styles/fc-game-day.css";

function GameDayBoard({
  title,
  meta,
  scoutingNotes,
  categories,
  activeIndex,
  liveSync,
  onClose,
}: {
  title: string;
  meta: string;
  scoutingNotes?: string;
  categories: ReturnType<typeof buildGameDayCategoriesFromShareEntries>;
  activeIndex: number;
  liveSync?: boolean;
  onClose: () => void;
}) {
  const active = categories[activeIndex] ?? categories[0];

  return (
    <div className="fc-game-day-overlay" id="game-day-share-overlay">
      <header className="fc-game-day-header">
        <div className="fc-game-day-badge staff">Staff live</div>
        <h1 className="fc-game-day-title">{title}</h1>
        <p className="fc-game-day-meta">{meta}</p>
        {scoutingNotes?.trim() ? (
          <p className="fc-game-day-keys">
            <strong>Keys</strong> {scoutingNotes.trim()}
          </p>
        ) : null}
        <button type="button" className="fc-game-day-close" onClick={onClose}>
          ✕ Close
        </button>
      </header>

      <div className="fc-game-day-toolbar">
        <div className="fc-game-day-category-strip" role="tablist" aria-label="Categories">
          {categories.map((category, index) => (
            <button
              key={`${category.categoryId}-${category.label}`}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={`fc-game-day-category-pill${
                index === activeIndex ? " active" : ""
              }`}
              disabled
            >
              {category.label}
            </button>
          ))}
        </div>
        <p className="fc-game-day-staff-hint">
          {liveSync
            ? "Staff live — syncs with coach every few seconds"
            : "Staff view — follows coach category on this device"}
        </p>
      </div>

      {active ? (
        <section className="fc-game-day-active" aria-label={active.label}>
          <h2 className="fc-game-day-active-title">{active.label}</h2>
          <ul className="fc-game-day-call-list">
            {active.calls.map((call) => (
              <li key={call.id} className="fc-game-day-call-row">
                <span className="fc-game-day-call-name">{call.name}</span>
                {call.notes ? (
                  <span className="fc-game-day-call-note">{call.notes}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function GameDayShareOverlay() {
  const session = useShareStore((s) => s.gameDayShareSession);
  const clearGameDayShareSession = useShareStore((s) => s.clearGameDayShareSession);
  const mounted = useClientMounted();

  const categories = useMemo(
    () => (session ? buildGameDayCategoriesFromShareEntries(session.entries) : []),
    [session],
  );

  const activeIndex = useSyncedGameDayIndex(
    session?.planId || "",
    categories,
    session?.activeCategoryId,
    session?.syncToken,
  );

  if (!session || !mounted || !categories.length) return null;

  const metaParts = [
    formatGamePlanDate(session.plan.gameDate),
    formatGamePlanHomeAway(session.plan.homeAway as "home" | "away" | "neutral" | undefined),
    session.plan.team,
    session.plan.location,
  ].filter(Boolean);

  return createPortal(
    <GameDayBoard
      title={session.plan.title}
      meta={metaParts.join(" · ")}
      scoutingNotes={session.plan.scoutingNotes}
      categories={categories}
      activeIndex={activeIndex}
      liveSync={!!session.syncToken}
      onClose={clearGameDayShareSession}
    />,
    document.body,
  );
}
