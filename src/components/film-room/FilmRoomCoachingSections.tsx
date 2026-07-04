"use client";

import {
  COACHING_CATEGORY_LABELS,
  COACHING_CATEGORY_ORDER,
  coachingCueKey,
} from "@/lib/film-room/film-coaching-format";
import {
  COUNTER_COVERAGE_LABELS,
  suggestDefensePlaysForCounter,
} from "@/lib/film-room/film-counter-playbook";
import type {
  FilmClipCoachingCategoryId,
  FilmClipCoachingRecommendations,
  FilmClipCounterSuggestion,
} from "@/lib/film-room/film-clip-analyze-types";
import type { StoredPlay } from "@/types/library";
import { useMemo } from "react";

interface Props {
  coaching: FilmClipCoachingRecommendations;
  selectedKeys: ReadonlySet<string>;
  onToggle: (categoryId: FilmClipCoachingCategoryId, index: number) => void;
  plays?: StoredPlay[];
}

function CounterCard({
  counter,
  checked,
  onToggle,
  matchedPlays,
}: {
  counter: FilmClipCounterSuggestion;
  checked: boolean;
  onToggle: () => void;
  matchedPlays: StoredPlay[];
}) {
  return (
    <label
      className={`fc-film-coaching-item fc-film-counter-card fc-film-coaching-item-selectable${checked ? " selected" : ""}`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="fc-film-coaching-item-body">
        <span className="fc-film-counter-badges">
          <span className="fc-film-counter-coverage">
            {COUNTER_COVERAGE_LABELS[counter.coverage]}
          </span>
          {counter.targetsPattern ? (
            <span className="fc-film-counter-pattern">vs {counter.targetsPattern}</span>
          ) : null}
          {counter.priority ? (
            <span
              className={`fc-film-coaching-priority fc-film-coaching-priority-${counter.priority}`}
            >
              {counter.priority}
            </span>
          ) : null}
        </span>
        <span className="fc-film-coaching-item-title">{counter.title}</span>
        <span className="fc-film-coaching-item-detail">{counter.detail}</span>
        {counter.weakPoint ? (
          <span className="fc-film-counter-meta">
            <strong>They want:</strong> {counter.weakPoint}
          </span>
        ) : null}
        {counter.trigger ? (
          <span className="fc-film-counter-meta">
            <strong>Trigger:</strong> {counter.trigger}
          </span>
        ) : null}
        <div className="fc-film-counter-rules">
          {counter.ballHandlerRule ? (
            <span className="fc-film-counter-rule">
              <strong>BH</strong> {counter.ballHandlerRule}
            </span>
          ) : null}
          {counter.screenerRule ? (
            <span className="fc-film-counter-rule">
              <strong>Big</strong> {counter.screenerRule}
            </span>
          ) : null}
        </div>
        {matchedPlays.length ? (
          <ul className="fc-film-counter-matches" aria-label="Library matches">
            {matchedPlays.map((play) => (
              <li key={play.id}>{play.title}</li>
            ))}
          </ul>
        ) : (
          <span className="fc-film-counter-no-match">
            Tag defense plays with coverage name (ICE, switch, blitz…)
          </span>
        )}
      </span>
    </label>
  );
}

export function FilmRoomCoachingSections({
  coaching,
  selectedKeys,
  onToggle,
  plays = [],
}: Props) {
  const counterMatches = useMemo(() => {
    return coaching.counters.map((counter) =>
      suggestDefensePlaysForCounter(plays, counter, new Set(), 2).map(
        (row) => row.play,
      ),
    );
  }, [coaching.counters, plays]);

  const hasAny = COACHING_CATEGORY_ORDER.some(
    (key) => coaching[key].length > 0,
  );
  if (!hasAny) {
    return (
      <p className="fc-film-analyze-defense-empty">
        No coaching suggestions for this clip — try a clearer pause point or upload
        a higher-quality clip.
      </p>
    );
  }

  return (
    <div className="fc-film-coaching-sections">
      {COACHING_CATEGORY_ORDER.map((categoryId) => {
        const items = coaching[categoryId];
        if (!items.length) return null;
        const isCounters = categoryId === "counters";
        return (
          <section
            key={categoryId}
            className={`fc-film-coaching-block${isCounters ? " fc-film-coaching-block-counters" : ""}`}
          >
            <h4 className="fc-film-coaching-block-title">
              {COACHING_CATEGORY_LABELS[categoryId]}
            </h4>
            {isCounters ? (
              <p className="fc-film-counter-section-hint">
                Coverage + assignments vs their set. Matched plays come from your
                library tags.
              </p>
            ) : null}
            <ul className="fc-film-coaching-list">
              {items.map((item, index) => {
                const key = coachingCueKey(categoryId, index);
                const checked = selectedKeys.has(key);
                if (isCounters) {
                  const counter = item as FilmClipCounterSuggestion;
                  return (
                    <li key={key}>
                      <CounterCard
                        counter={counter}
                        checked={checked}
                        onToggle={() => onToggle(categoryId, index)}
                        matchedPlays={counterMatches[index] ?? []}
                      />
                    </li>
                  );
                }
                return (
                  <li key={key}>
                    <label
                      className={`fc-film-coaching-item fc-film-coaching-item-selectable${checked ? " selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(categoryId, index)}
                      />
                      <span className="fc-film-coaching-item-body">
                        <span className="fc-film-coaching-item-head">
                          <span className="fc-film-coaching-item-title">
                            {item.title}
                          </span>
                          {item.priority ? (
                            <span
                              className={`fc-film-coaching-priority fc-film-coaching-priority-${item.priority}`}
                            >
                              {item.priority}
                            </span>
                          ) : null}
                        </span>
                        <span className="fc-film-coaching-item-detail">
                          {item.detail}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
