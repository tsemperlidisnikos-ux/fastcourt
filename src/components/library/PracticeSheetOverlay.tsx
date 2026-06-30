"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { PracticeSheetDocument } from "@/components/library/PracticeSheetDocument";
import type { InkStroke } from "@/components/library/PracticeSheetInkLayer";
import { useOverlayPrint } from "@/lib/print/use-overlay-print";
import { useSettingsStore } from "@/stores/settings-store";

const INK_COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a"] as const;

interface Props {
  onClose: () => void;
}

export function PracticeSheetOverlay({ onClose }: Props) {
  const [brandSnapshot] = useState(() => {
    const pdfBrand = useSettingsStore.getState().pdfBrand;
    return {
      clubName: pdfBrand.clubName.trim(),
      clubLogo: pdfBrand.logoDataUrl?.trim() ?? "",
      footerText: pdfBrand.footerText.trim(),
    };
  });

  const { clubName, clubLogo, footerText } = brandSnapshot;

  const [mode, setMode] = useState<"draw" | "preview">("draw");
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [inkColor, setInkColor] = useState<string>(INK_COLORS[0]);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const handlePrint = useOverlayPrint({
    printClass: "fc-practice-sheet-printing",
    contentRootId: "fc-practice-sheet-content",
    onClose,
  });

  function handleClearInk() {
    setStrokes([]);
  }

  const title = clubName || "Practice sheet";

  return createPortal(
    <div
      className="fc-print-overlay fc-practice-sheet-overlay"
      id="practice-sheet-overlay"
      role="dialog"
      aria-labelledby="practice-sheet-overlay-title"
    >
      <style
        data-fc-practice-sheet-print-page
        dangerouslySetInnerHTML={{
          __html: "@page { size: A4 landscape; margin: 0.4cm; }",
        }}
      />
      <div className="fc-print-overlay-panel fc-print-overlay-panel-practice-sheet">
        <div className="fc-print-overlay-toolbar fc-practice-sheet-toolbar no-print">
          <div className="fc-practice-sheet-toolbar-main">
            <h2 className="fc-print-overlay-title" id="practice-sheet-overlay-title">
              {title}
            </h2>
            <p className="fc-practice-sheet-toolbar-hint">
              {mode === "draw"
                ? "Draw on the sheet with the pen. Switch to Preview before printing."
                : "Preview mode — landscape print. Use Print / Save PDF when ready."}
            </p>
          </div>
          <div className="fc-practice-sheet-toolbar-tools">
            {mode === "draw" ? (
              <>
                <div className="fc-practice-sheet-tool-group" role="group" aria-label="Drawing tools">
                  <button
                    type="button"
                    className={`fc-practice-sheet-tool-btn${tool === "pen" ? " is-active" : ""}`}
                    onClick={() => setTool("pen")}
                  >
                    Pen
                  </button>
                  <button
                    type="button"
                    className={`fc-practice-sheet-tool-btn${tool === "eraser" ? " is-active" : ""}`}
                    onClick={() => setTool("eraser")}
                  >
                    Eraser
                  </button>
                </div>
                <div className="fc-practice-sheet-colors" role="group" aria-label="Pen colors">
                  {INK_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`fc-practice-sheet-color${inkColor === color ? " is-active" : ""}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Ink color ${color}`}
                      aria-pressed={inkColor === color}
                      onClick={() => setInkColor(color)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="fc-practice-sheet-tool-btn"
                  onClick={handleClearInk}
                  disabled={strokes.length === 0}
                >
                  Clear ink
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={`fc-practice-sheet-tool-btn${mode === "preview" ? " is-active" : ""}`}
              onClick={() => setMode(mode === "draw" ? "preview" : "draw")}
            >
              {mode === "draw" ? "Preview" : "Edit"}
            </button>
          </div>
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
          className="fc-print-overlay-body fc-practice-sheet-body"
          id="fc-practice-sheet-content"
        >
          <PracticeSheetDocument
            teamLogo={clubLogo}
            teamName={clubName}
            footerText={footerText}
            strokes={strokes}
            onStrokesChange={setStrokes}
            inkColor={inkColor}
            inkWidth={2.5}
            tool={tool}
            drawingEnabled={mode === "draw"}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
