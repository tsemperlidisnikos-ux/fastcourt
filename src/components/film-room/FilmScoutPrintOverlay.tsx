"use client";

import { createPortal } from "react-dom";
import { FilmScoutPrintDocument } from "@/components/film-room/FilmScoutPrintDocument";
import { useOverlayPrint } from "@/lib/print/use-overlay-print";
import type { FilmScoutPrintModel } from "@/lib/film-room/film-scout-print-model";
import "@/styles/fc-film-scout-print.css";

interface Props {
  model: FilmScoutPrintModel;
  onClose: () => void;
}

export function FilmScoutPrintOverlay({ model, onClose }: Props) {
  const handlePrint = useOverlayPrint({
    printClass: "fc-film-scout-print-active",
    contentRootId: "fc-film-scout-print-content",
    onClose,
  });

  return createPortal(
    <div
      className="fc-print-overlay fc-film-scout-print-overlay"
      id="film-scout-print-overlay"
      role="dialog"
      aria-labelledby="film-scout-print-title"
    >
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-print-overlay-panel fc-print-overlay-panel-film-scout">
        <div className="fc-print-overlay-toolbar fc-film-scout-print-toolbar no-print">
          <h2 className="fc-print-overlay-title" id="film-scout-print-title">
            {model.reportTitle}
          </h2>
          <p className="fc-film-scout-print-toolbar-hint">
            Staff scout report. Use <strong>Print / Save PDF</strong> when ready.
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
          className="fc-print-overlay-body fc-film-scout-print-body"
          id="fc-film-scout-print-content"
        >
          <FilmScoutPrintDocument model={model} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
