"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { PlaybookPrintDocument } from "@/components/library/PlaybookPrintDocument";
import type { PlaybookSection } from "@/types/library-meta";
import type { PlaybookPrintConfig } from "@/types/playbook-print-config";
import type { StoredPlay } from "@/types/library";

interface Props {
  playbook: PlaybookSection;
  plays: StoredPlay[];
  printConfig?: PlaybookPrintConfig;
  onClose: () => void;
}

export function PlaybookPrintOverlay({
  playbook,
  plays,
  printConfig,
  onClose,
}: Props) {
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
    <div className="fc-print-overlay" id="playbook-print-overlay" role="dialog">
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-print-overlay-panel fc-print-overlay-panel-playbook">
        <div className="fc-print-overlay-toolbar no-print">
          <h2 className="fc-print-overlay-title">
            {playbook.name} — Print preview
          </h2>
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
          className="fc-print-overlay-body fc-print-overlay-body-playbook"
          id="fc-playbook-print-content"
        >
          <PlaybookPrintDocument
            playbookName={playbook.name}
            team={playbook.team}
            subtitle={playbook.subtitle}
            plays={plays}
            printConfig={printConfig}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
