"use client";

import { createPortal } from "react-dom";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { stripNotesForPrint } from "@/lib/library/playbook-print";
import {
  resolvePdfCoverSubtitle,
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "@/lib/settings/pdf-brand-export";
import { useOverlayPrint } from "@/lib/print/use-overlay-print";
import { useSettingsStore } from "@/stores/settings-store";
import type { StoredPlay } from "@/types/library";

interface Props {
  play: StoredPlay;
  onClose: () => void;
}

export function LibraryPrintOverlay({ play, onClose }: Props) {
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const coverTeam = resolvePdfCoverTeam(pdfBrand, play.team);
  const tagline = resolvePdfCoverSubtitle(pdfBrand);
  const footerText = resolvePdfFooterText(pdfBrand);
  const handlePrint = useOverlayPrint({
    printClass: "fc-library-print-active",
    contentRootId: "fc-print-preview-content",
    onClose,
  });

  return createPortal(
    <div className="fc-print-overlay" id="print-preview-overlay" role="dialog">
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div
        className={[
          "fc-print-overlay-panel",
          play.frames.length === 1 ? "fc-print-overlay-panel-compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="fc-print-overlay-toolbar no-print">
          <h2 className="fc-print-overlay-title">{play.title}</h2>
          <div className="fc-print-overlay-actions">
            <button type="button" className="fc-print-btn" onClick={handlePrint}>
              Print
            </button>
            <button type="button" className="fc-print-close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="fc-print-overlay-body" id="fc-print-preview-content">
          <header className="fc-print-doc-header fc-print-doc-header-print-only">
            {coverTeam ? (
              <p className="fc-print-doc-club">{coverTeam}</p>
            ) : null}
            <h1>{play.title}</h1>
            <p>
              {[play.season, play.team, play.series].filter(Boolean).join(" · ")}
            </p>
            {tagline ? <p className="fc-print-doc-tagline">{tagline}</p> : null}
          </header>
          <div className="fc-print-frames-grid">
            {play.frames.map((frame, index) => {
              const frameLabel = frame.name || `Frame ${index + 1}`;
              const frameNotes = stripNotesForPrint(frame.notes ?? "");
              return (
                <section key={frame.id} className="fc-print-frame-card">
                  <div className="fc-print-frame-stack">
                    {play.frames.length > 1 ? (
                      <h3 className="fc-print-frame-title">{frameLabel}</h3>
                    ) : null}
                    <div className="fc-print-frame-court">
                      <CourtFrameThumbnail
                        courtType={play.courtType}
                        frame={frame}
                        courtView={play.courtView}
                        size="print"
                        alt={frameLabel}
                      />
                    </div>
                    {frameNotes ? (
                      <p className="fc-print-frame-notes fc-frame-notes-bounded">
                        {frameNotes}
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
          {footerText ? (
            <footer className="fc-print-doc-footer">{footerText}</footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
