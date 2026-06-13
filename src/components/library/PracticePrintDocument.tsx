"use client";

import { Fragment } from "react";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { getPracticeSessionTotalMinutes } from "@/lib/practice/practice-items";
import type { ResolvedPracticeRow } from "@/lib/practice/practice-items";
import type { PracticeSession } from "@/types/library-meta";

function formatPracticeDate(date: string) {
  if (!date) return "";
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PracticePrintDocument({
  session,
  rows,
}: {
  session: PracticeSession;
  rows: ResolvedPracticeRow[];
}) {
  const totalMin = getPracticeSessionTotalMinutes(session);
  const team =
    session.team && session.team !== "No Team" ? session.team : "";
  const rowEndTimes = rows.reduce<number[]>((times, { item }) => {
    const prev = times.length ? times[times.length - 1]! : 0;
    times.push(prev + (Number(item.durationMin) || 0));
    return times;
  }, []);

  return (
    <div className="fc-practice-print-doc">
      <div className="fc-practice-print-cover">
        {team ? <div className="fc-practice-print-team">{team}</div> : null}
        <h1 className="fc-practice-print-title">{session.title || "Practice Session"}</h1>
        {session.date ? (
          <p className="fc-practice-print-date">{formatPracticeDate(session.date)}</p>
        ) : null}
        <p className="fc-practice-print-meta">
          {rows.length} block{rows.length !== 1 ? "s" : ""} · {totalMin} minutes planned
        </p>
        {session.notes?.trim() ? (
          <div className="fc-practice-print-session-notes">
            <strong>Session notes</strong>
            <p>{session.notes.trim()}</p>
          </div>
        ) : null}
      </div>

      <table className="fc-practice-plan-table">
        <thead>
          <tr>
            <th>#</th>
            <th>At</th>
            <th>Block</th>
            <th>Time</th>
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, play, index }, rowIndex) => {
            const running = rowEndTimes[rowIndex] ?? 0;
            const blockName = play?.title || item.cueLabel || "Block";
            const kind = play ? (play.type === "drill" ? "Drill" : "Play") : "Block";
            const blockNotes = (item.notes || "").trim();
            const frames = play?.frames ?? [];

            return (
              <Fragment key={item.id}>
                <tr className="fc-practice-plan-row">
                  <td className="fc-practice-plan-num">{index + 1}</td>
                  <td className="fc-practice-plan-time">{running}′</td>
                  <td className="fc-practice-plan-name">
                    <div className="fc-practice-plan-name-text">{blockName}</div>
                    <div className="fc-practice-plan-name-meta">
                      {kind}
                      {play?.series ? ` · ${play.series}` : ""}
                    </div>
                    {blockNotes ? (
                      <div className="fc-practice-plan-block-notes">{blockNotes}</div>
                    ) : null}
                  </td>
                  <td className="fc-practice-plan-dur">
                    {Number(item.durationMin) || 0} min
                  </td>
                  <td className="fc-practice-plan-thumb" aria-hidden="true">
                    {play ? "🏀" : "📋"}
                  </td>
                </tr>
                {play && frames.length > 0 ? (
                  <tr className="fc-practice-plan-frames-row">
                    <td colSpan={5} className="fc-practice-plan-frames-cell">
                      <div className="fc-print-frames-grid fc-practice-block-frames-grid">
                        {frames.map((frame, frameIndex) => {
                          const frameLabel =
                            frame.name || `Frame ${frameIndex + 1}`;
                          return (
                            <section
                              key={frame.id}
                              className="fc-print-frame-card fc-practice-frame-card"
                            >
                              {frames.length > 1 ? (
                                <h3 className="fc-practice-frame-label">{frameLabel}</h3>
                              ) : null}
                              <div className="fc-print-frame-court fc-practice-frame-court">
                                <CourtFrameThumbnail
                                  courtType={play.courtType}
                                  frame={frame}
                                  size="print"
                                  alt={frameLabel}
                                />
                              </div>
                              {(frame.notes ?? "").trim() ? (
                                <p className="fc-practice-frame-notes">
                                  {(frame.notes ?? "").trim()}
                                </p>
                              ) : null}
                            </section>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
