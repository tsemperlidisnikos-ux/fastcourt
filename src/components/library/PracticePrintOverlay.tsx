"use client";

import { createPortal } from "react-dom";
import { PracticePrintDocument } from "@/components/library/PracticePrintDocument";
import { useOverlayPrint } from "@/lib/print/use-overlay-print";
import type { ResolvedPracticeRow } from "@/lib/practice/practice-items";
import type { PracticeSession } from "@/types/library-meta";

interface Props {
  session: PracticeSession;
  rows: ResolvedPracticeRow[];
  onClose: () => void;
}

export function PracticePrintOverlay({ session, rows, onClose }: Props) {
  const handlePrint = useOverlayPrint({
    printClass: "fc-practice-print-active",
    contentRootId: "fc-practice-print-content",
    onClose,
  });

  const title = session.title || "Practice";

  return createPortal(
    <div
      className="fc-print-overlay fc-practice-print-overlay"
      id="practice-print-overlay"
      role="dialog"
      aria-labelledby="practice-print-overlay-title"
    >
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-print-overlay-panel fc-print-overlay-panel-practice">
        <div className="fc-print-overlay-toolbar fc-practice-print-toolbar no-print">
          <h2 className="fc-print-overlay-title" id="practice-print-overlay-title">
            {title}
          </h2>
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
