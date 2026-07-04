"use client";

import {
  filmAnalysisCoachTagSummary,
  filmAnalysisRecordLabel,
} from "@/lib/film-room/film-analysis-history";
import { formatFilmEventTime } from "@/lib/film-room/film-event-tags";
import type { FilmRoomAnalysisRecord } from "@/types/film-room";

interface Props {
  analyses: FilmRoomAnalysisRecord[];
  onOpen: (record: FilmRoomAnalysisRecord) => void;
  onSeek: (time: number) => void;
  onRemove: (recordId: string) => void;
}

export function FilmRoomAnalysisHistoryPanel({
  analyses,
  onOpen,
  onSeek,
  onRemove,
}: Props) {
  if (!analyses.length) return null;

  const sorted = [...analyses].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className="fc-film-analysis-history" aria-label="Analysis history">
      <h3 className="fc-film-analysis-history-title">Analysis history</h3>
      <ul className="fc-film-analysis-history-list">
        {sorted.map((record) => {
          const tagSummary = filmAnalysisCoachTagSummary(record.coachTags);
          return (
            <li key={record.id} className="fc-film-analysis-history-row">
              <button
                type="button"
                className="fc-film-analysis-history-open"
                onClick={() => onOpen(record)}
              >
                <span className="fc-film-analysis-history-time">
                  {formatFilmEventTime(record.playheadTime)}
                </span>
                <span className="fc-film-analysis-history-summary">
                  {filmAnalysisRecordLabel(record)}
                </span>
                <span className="fc-film-analysis-history-meta">
                  {record.frameCount} frames
                  {tagSummary ? ` · ${tagSummary}` : ""}
                </span>
              </button>
              <button
                type="button"
                className="fc-film-analysis-history-seek"
                title="Jump to playhead"
                onClick={() => onSeek(record.playheadTime)}
              >
                ↗
              </button>
              <button
                type="button"
                className="fc-film-analysis-history-remove"
                aria-label="Remove saved analysis"
                onClick={() => onRemove(record.id)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
