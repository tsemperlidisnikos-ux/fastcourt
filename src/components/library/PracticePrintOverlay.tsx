"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PracticePrintDocument } from "@/components/library/PracticePrintDocument";
import type { ResolvedPracticeRow } from "@/lib/practice/practice-items";
import type { PracticeSession } from "@/types/library-meta";

interface Props {
  session: PracticeSession;
  rows: ResolvedPracticeRow[];
  onClose: () => void;
}

export function PracticePrintOverlay({ session, rows, onClose }: Props) {
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

  const title = session.title || "Practice";

  return createPortal(
    <div className="fc-print-overlay fc-practice-print-overlay" id="practice-print-overlay" role="dialog">
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-print-overlay-panel fc-print-overlay-panel-practice">
        <div className="fc-print-overlay-toolbar fc-practice-print-toolbar no-print">
          <h2 className="fc-print-overlay-title">{title}</h2>
          <p className="fc-practice-print-toolbar-hint">
            Use <strong>Print / Save PDF</strong> when ready.
          </p>
          <div className="fc-print-overlay-actions">
            <button type="button" className="fc-print-btn" onClick={handlePrint}>
              Print / Save PDF
            </button>
            <button type="button" className="fc-print-close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div
          className="fc-print-overlay-body fc-practice-print-body"
          id="fc-practice-print-content"
        >
          <PracticePrintDocument session={session} rows={rows} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
