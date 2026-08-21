"use client";

import { createPortal } from "react-dom";
import { OpponentScoutPrintDocument } from "@/components/opponent-scout/OpponentScoutPrintDocument";
import { useOverlayPrint } from "@/lib/print/use-overlay-print";
import type { OpponentScoutReport } from "@/types/opponent-scout";
import "@/styles/fc-opponent-scout-print.css";

interface Props {
  report: OpponentScoutReport;
  brandLogoDataUrl?: string;
  footerLogoDataUrl?: string;
  onClose: () => void;
}

export function OpponentScoutPrintOverlay({
  report,
  brandLogoDataUrl,
  footerLogoDataUrl,
  onClose,
}: Props) {
  const handlePrint = useOverlayPrint({
    printClass: "fc-opponent-scout-print-active",
    contentRootId: "fc-opponent-scout-print-content",
    onClose,
    strategy: "iframe",
  });

  return createPortal(
    <div
      className="fc-print-overlay fc-opponent-scout-print-overlay"
      id="opponent-scout-print-overlay"
      role="dialog"
      aria-labelledby="opponent-scout-print-title"
    >
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-print-overlay-panel fc-print-overlay-panel-opponent-scout">
        <div className="fc-print-overlay-toolbar fc-os-print-toolbar no-print">
          <h2 className="fc-print-overlay-title" id="opponent-scout-print-title">
            Opponent Scout — {report.teamName || "Report"}
          </h2>
          <p className="fc-os-print-toolbar-hint">
            Preview the report, then use <strong>Print / Save PDF</strong>.
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
          className="fc-print-overlay-body fc-os-print-body"
          id="fc-opponent-scout-print-content"
        >
          <OpponentScoutPrintDocument
            report={report}
            brandLogoDataUrl={brandLogoDataUrl}
            footerLogoDataUrl={footerLogoDataUrl}
            pageNumber={1}
            pageCount={1}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
