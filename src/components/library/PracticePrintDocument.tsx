"use client";

import dynamic from "next/dynamic";
import { Fragment } from "react";
import { getPracticeSessionTotalMinutes, isPracticeItemMissing } from "@/lib/practice/practice-items";
import { stripNotesForPrint } from "@/lib/library/playbook-print";
import {
  resolvePdfCoverSubtitle,
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "@/lib/settings/pdf-brand-export";
import { useSettingsStore } from "@/stores/settings-store";
import type { ResolvedPracticeRow } from "@/lib/practice/practice-items";
import type { PracticeSession } from "@/types/library-meta";

const CourtFrameThumbnail = dynamic(
  () =>
    import("@/components/designer/CourtFrameThumbnail").then(
      (mod) => mod.CourtFrameThumbnail,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="fc-practice-frame-court-loading" aria-hidden>
        …
      </div>
    ),
  },
);

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
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const totalMin = getPracticeSessionTotalMinutes(session);
  const coverTeam = resolvePdfCoverTeam(pdfBrand, session.team);
  const tagline = resolvePdfCoverSubtitle(pdfBrand);
  const footerText = resolvePdfFooterText(pdfBrand);
  const rowEndTimes = rows.reduce<number[]>((times, { item }) => {
    const prev = times.length ? times[times.length - 1]! : 0;
    times.push(prev + (Number(item.durationMin) || 0));
    return times;
  }, []);

  return (
    <div className="fc-practice-print-doc">
      <div className="fc-practice-print-cover">
        {coverTeam ? <div className="fc-practice-print-team">{coverTeam}</div> : null}
        {tagline ? (
          <p className="fc-practice-print-tagline">{tagline}</p>
        ) : null}
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
        {session.liveNotes?.trim() ? (
          <div className="fc-practice-print-live-notes">
            <strong>Gym notes</strong>
            <p>{session.liveNotes.trim()}</p>
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
            const blockName =
              play?.title ||
              item.cueLabel ||
              (isPracticeItemMissing({ item, play, index, label: null })
                ? "Missing from library"
                : "Block");
            const kind = play ? (play.type === "drill" ? "Drill" : "Play") : "Block";
            const blockNotes = (item.notes || "").trim();
            const frames = play?.frames ?? [];
            const hasLinkedPlay = !!play;
            const hasCourtFrames = hasLinkedPlay && frames.length > 0;

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
                    {!hasLinkedPlay && isPracticeItemMissing({ item, play, index, label: null }) ? (
                      <div className="fc-practice-plan-no-court">
                        Missing from library — replace in Practice planner before printing.
                      </div>
                    ) : null}
                    {!hasLinkedPlay && !isPracticeItemMissing({ item, play, index, label: null }) ? (
                      <div className="fc-practice-plan-no-court">
                        Text block — link a library play to include court frames.
                      </div>
                    ) : null}
                    {hasLinkedPlay && !hasCourtFrames ? (
                      <div className="fc-practice-plan-no-court">
                        Linked play has no frames yet.
                      </div>
                    ) : null}
                  </td>
                  <td className="fc-practice-plan-dur">
                    {Number(item.durationMin) || 0} min
                  </td>
                  <td className="fc-practice-plan-thumb" aria-hidden="true">
                    {hasCourtFrames ? "🏀" : "📋"}
                  </td>
                </tr>
                {hasCourtFrames ? (
                  <tr className="fc-practice-plan-frames-row">
                    <td colSpan={5} className="fc-practice-plan-frames-cell">
                      <div className="fc-print-frames-grid fc-practice-block-frames-grid">
                        {frames.map((frame, frameIndex) => {
                          const frameLabel =
                            frame.name || `Frame ${frameIndex + 1}`;
                          const frameNotes = stripNotesForPrint(frame.notes ?? "");
                          return (
                            <section
                              key={frame.id}
                              className="fc-print-frame-card fc-practice-frame-card"
                            >
                              <div className="fc-practice-frame-stack">
                                <h3 className="fc-practice-frame-label">{frameLabel}</h3>
                                <div className="fc-print-frame-court fc-practice-frame-court">
                                  <CourtFrameThumbnail
                                    courtType={play.courtType}
                                    frame={frame}
                                    courtView={play.courtView}
                                    size="print"
                                    alt={frameLabel}
                                  />
                                </div>
                                {frameNotes ? (
                                  <p className="fc-practice-frame-notes fc-frame-notes-bounded">
                                    {frameNotes}
                                  </p>
                                ) : null}
                              </div>
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
      {footerText ? (
        <footer className="fc-practice-print-footer">{footerText}</footer>
      ) : null}
    </div>
  );
}
