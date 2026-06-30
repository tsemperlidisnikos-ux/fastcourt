"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  buildGameDayCategories,
  readGameDayState,
  resolveGameDayCategoryIndex,
  subscribeGameDayState,
  writeGameDayState,
  type GameDayCategoryGroup,
} from "@/lib/game-plan/game-day";
import { formatGamePlanDate, formatGamePlanHomeAway } from "@/lib/game-plan/game-plan-items";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { GamePlan, GamePlanCategoryId } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import "@/styles/fc-game-day.css";

interface Props {
  plan: GamePlan;
  plays: StoredPlay[];
  onClose: () => void;
}

function GameDayBoard({
  title,
  meta,
  scoutingNotes,
  categories,
  activeIndex,
  readOnly = false,
  onSelectIndex,
  onPrev,
  onNext,
  onClose,
  badge = "Game day",
}: {
  title: string;
  meta: string;
  scoutingNotes?: string;
  categories: GameDayCategoryGroup[];
  activeIndex: number;
  readOnly?: boolean;
  onSelectIndex?: (index: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
  badge?: string;
}) {
  const active = categories[activeIndex] ?? categories[0];

  return (
    <div className="fc-game-day-overlay" id="game-day-overlay">
      <header className="fc-game-day-header">
        <div className="fc-game-day-badge">{badge}</div>
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
              disabled={readOnly && index !== activeIndex}
              onClick={() => onSelectIndex?.(index)}
            >
              {category.label}
            </button>
          ))}
        </div>
        {!readOnly ? (
          <div className="fc-game-day-nav">
            <button
              type="button"
              className="fc-game-day-nav-btn"
              disabled={activeIndex <= 0}
              onClick={onPrev}
            >
              Prev
            </button>
            <button
              type="button"
              className="fc-game-day-nav-btn primary"
              disabled={activeIndex >= categories.length - 1}
              onClick={onNext}
            >
              Next
            </button>
          </div>
        ) : (
          <p className="fc-game-day-staff-hint">Staff view — follows coach category</p>
        )}
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

export function GameDayOverlay({ plan, plays, onClose }: Props) {
  const updateGamePlan = useOrganizerStore((s) => s.updateGamePlan);
  const mounted = useClientMounted();
  const categories = useMemo(
    () => buildGameDayCategories(plan, plays),
    [plan, plays],
  );

  const initialIndex = useMemo(() => {
    const synced =
      readGameDayState(plan.id)?.activeCategoryId || plan.gameDay?.activeCategoryId;
    return resolveGameDayCategoryIndex(categories, synced);
  }, [categories, plan.gameDay?.activeCategoryId, plan.id]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const pushCategory = useCallback(
    (index: number) => {
      const category = categories[index];
      if (!category) return;
      setActiveIndex(index);
      const updatedAt = new Date().toISOString();
      writeGameDayState({
        planId: plan.id,
        activeCategoryId: category.categoryId,
        updatedAt,
      });
      void updateGamePlan(plan.id, {
        gameDay: {
          activeCategoryId: category.categoryId,
          updatedAt,
        },
      });
    },
    [categories, plan.id, updateGamePlan],
  );

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex, plan.id]);

  const metaParts = [
    formatGamePlanDate(plan.gameDate),
    formatGamePlanHomeAway(plan.homeAway),
    plan.team,
    plan.location,
  ].filter(Boolean);

  if (!mounted || !categories.length) return null;

  return createPortal(
    <GameDayBoard
      title={plan.title}
      meta={metaParts.join(" · ")}
      scoutingNotes={plan.scoutingNotes}
      categories={categories}
      activeIndex={activeIndex}
      onSelectIndex={pushCategory}
      onPrev={() => pushCategory(Math.max(0, activeIndex - 1))}
      onNext={() => pushCategory(Math.min(categories.length - 1, activeIndex + 1))}
      onClose={onClose}
    />,
    document.body,
  );
}

export function useSyncedGameDayIndex(
  planId: string,
  categories: GameDayCategoryGroup[],
  initialCategoryId?: GamePlanCategoryId,
) {
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const plan = gamePlans.find((row) => row.id === planId);

  const resolveIndex = useCallback(
    (categoryId?: GamePlanCategoryId | null) =>
      resolveGameDayCategoryIndex(categories, categoryId),
    [categories],
  );

  const [activeIndex, setActiveIndex] = useState(() =>
    resolveIndex(
      readGameDayState(planId)?.activeCategoryId ||
        plan?.gameDay?.activeCategoryId ||
        initialCategoryId,
    ),
  );

  useEffect(() => {
    return subscribeGameDayState(planId, (state) => {
      if (!state) return;
      setActiveIndex(resolveIndex(state.activeCategoryId));
    });
  }, [planId, resolveIndex]);

  useEffect(() => {
    const categoryId = plan?.gameDay?.activeCategoryId;
    if (!categoryId) return;
    setActiveIndex(resolveIndex(categoryId));
  }, [plan?.gameDay?.activeCategoryId, plan?.gameDay?.updatedAt, resolveIndex]);

  return activeIndex;
}
