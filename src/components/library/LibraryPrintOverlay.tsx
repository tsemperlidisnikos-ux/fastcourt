"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import type { StoredPlay } from "@/types/library";

interface Props {
  play: StoredPlay;
  onClose: () => void;
}

export function LibraryPrintOverlay({ play, onClose }: Props) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function handlePrint() {
    window.print();
  }

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
            <h1>{play.title}</h1>
            <p>
              {[play.season, play.team, play.series].filter(Boolean).join(" · ")}
            </p>
          </header>
          <div className="fc-print-frames-grid">
            {play.frames.map((frame, index) => {
              const frameLabel = frame.name || `Frame ${index + 1}`;
              return (
                <section key={frame.id} className="fc-print-frame-card">
                  {play.frames.length > 1 ? (
                    <h3>{frameLabel}</h3>
                  ) : null}
                  <div className="fc-print-frame-court">
                    <CourtFrameThumbnail
                      courtType={play.courtType}
                      frame={frame}
                      size="print"
                      alt={frameLabel}
                    />
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
