"use client";

import { createPortal } from "react-dom";
import { GamePlanBenchPrintDocument } from "@/components/library/GamePlanBenchPrintDocument";
import { useOverlayPrint } from "@/lib/print/use-overlay-print";
import type { GamePlan } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

interface Props {
  plan: GamePlan;
  playsById: Map<string, StoredPlay>;
  onClose: () => void;
}

export function GamePlanBenchPrintOverlay({ plan, playsById, onClose }: Props) {
  const handlePrint = useOverlayPrint({
    printClass: "fc-game-plan-bench-print-active",
    contentRootId: "fc-game-plan-bench-print-content",
    onClose,
  });

  return createPortal(
    <div
      className="fc-print-overlay fc-game-plan-bench-print-overlay"
      id="game-plan-bench-print-overlay"
      role="dialog"
      aria-labelledby="game-plan-bench-print-title"
    >
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-print-overlay-panel fc-print-overlay-panel-game-plan">
        <div className="fc-print-overlay-toolbar fc-game-plan-bench-print-toolbar no-print">
          <h2 className="fc-print-overlay-title" id="game-plan-bench-print-title">
            Bench card — {plan.title}
          </h2>
          <p className="fc-game-plan-bench-print-toolbar-hint">
            One-page call sheet. Use <strong>Print / Save PDF</strong> when ready.
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
          className="fc-print-overlay-body fc-game-plan-bench-print-body"
          id="fc-game-plan-bench-print-content"
        >
          <GamePlanBenchPrintDocument plan={plan} playsById={playsById} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
