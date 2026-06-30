"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  PracticeSheetInkLayer,
  type InkStroke,
} from "@/components/library/PracticeSheetInkLayer";
import {
  PRACTICE_SHEET_PDF_URL,
  computePracticeSheetWidthScale,
  renderPracticeSheetPdf,
  type PracticeSheetPageSize,
} from "@/lib/practice/practice-sheet-pdf";

interface TeamLogoOverlayProps {
  teamLogo?: string;
  teamName?: string;
}

const PracticeSheetTeamLogoOverlay = memo(function PracticeSheetTeamLogoOverlay({
  teamLogo,
  teamName,
}: TeamLogoOverlayProps) {
  const logo = teamLogo?.trim() ?? "";
  const name = teamName?.trim() ?? "";

  if (!logo) return null;

  return (
    <>
      <div className="fc-practice-sheet-brand-block">
        <img
          src={logo}
          alt={name || "Team logo"}
          className="fc-practice-sheet-team-logo"
        />
      </div>
      <div className="fc-practice-sheet-pdf-name-cover" aria-hidden="true" />
    </>
  );
});

interface Props {
  teamLogo?: string;
  teamName?: string;
  footerText?: string;
  strokes: InkStroke[];
  onStrokesChange: (strokes: InkStroke[]) => void;
  inkColor: string;
  inkWidth: number;
  tool: "pen" | "eraser";
  drawingEnabled: boolean;
}

const MIN_STAGE = 240;
const SIZE_EPSILON = 2;

export function PracticeSheetDocument({
  teamLogo,
  teamName,
  footerText,
  strokes,
  onStrokesChange,
  inkColor,
  inkWidth,
  tool,
  drawingEnabled,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderCancelRef = useRef<(() => void) | null>(null);
  const renderGenerationRef = useRef(0);
  const lastHostWidthRef = useRef<number | null>(null);
  const hasRenderedRef = useRef(false);

  const [pageSize, setPageSize] = useState<PracticeSheetPageSize | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadPdf(force = false) {
      const canvas = pdfCanvasRef.current;
      const host = stageRef.current;
      if (!canvas || !host) return;

      const rect = host.getBoundingClientRect();
      const availableWidth = Math.floor(rect.width);

      if (availableWidth < MIN_STAGE) {
        return;
      }

      const previousWidth = lastHostWidthRef.current;
      if (
        !force &&
        previousWidth != null &&
        Math.abs(previousWidth - availableWidth) <= SIZE_EPSILON
      ) {
        return;
      }

      lastHostWidthRef.current = availableWidth;

      renderCancelRef.current?.();
      renderCancelRef.current = null;

      const generation = ++renderGenerationRef.current;
      const firstRender = !hasRenderedRef.current;

      if (firstRender) {
        setLoading(true);
      }
      setLoadError(null);

      try {
        const scale = await computePracticeSheetWidthScale(
          PRACTICE_SHEET_PDF_URL,
          availableWidth,
        );
        if (cancelled || generation !== renderGenerationRef.current) return;

        const result = await renderPracticeSheetPdf(
          canvas,
          PRACTICE_SHEET_PDF_URL,
          scale,
        );
        if (cancelled || generation !== renderGenerationRef.current) {
          result.cancel();
          return;
        }

        renderCancelRef.current = result.cancel;
        hasRenderedRef.current = true;
        setPageSize(result.size);
        setLoadError(null);
      } catch (err) {
        if (cancelled || generation !== renderGenerationRef.current) return;
        const name = err instanceof Error ? err.name : "";
        if (name === "RenderingCancelledException") return;
        setLoadError(
          err instanceof Error ? err.message : "Could not load practice sheet PDF.",
        );
      } finally {
        if (!cancelled && generation === renderGenerationRef.current) {
          setLoading(false);
        }
      }
    }

    function scheduleLoad() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        void loadPdf();
      }, 150);
    }

    scheduleLoad();

    const observer = new ResizeObserver(scheduleLoad);
    observer.observe(stage);

    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
      renderCancelRef.current?.();
      renderCancelRef.current = null;
      renderGenerationRef.current += 1;
    };
  }, []);

  return (
    <div className="fc-practice-sheet-doc">
      {loading && !pageSize ? (
        <p className="fc-practice-sheet-loading">Loading practice sheet…</p>
      ) : null}
      {loadError ? (
        <p className="fc-practice-sheet-error" role="alert">
          {loadError}
        </p>
      ) : null}
      <div ref={stageRef} className="fc-practice-sheet-stage">
        <div
          className="fc-practice-sheet-page"
          style={
            pageSize
              ? {
                  width: pageSize.width,
                  height: pageSize.height,
                }
              : undefined
          }
        >
          <canvas
            ref={pdfCanvasRef}
            className="fc-practice-sheet-pdf"
            aria-hidden={loading && !pageSize}
          />
          <PracticeSheetTeamLogoOverlay teamLogo={teamLogo} teamName={teamName} />
          {footerText?.trim() ? (
            <div className="fc-practice-sheet-footer-line">{footerText.trim()}</div>
          ) : null}
          {pageSize ? (
            <PracticeSheetInkLayer
              width={pageSize.width}
              height={pageSize.height}
              strokes={strokes}
              onStrokesChange={onStrokesChange}
              inkColor={inkColor}
              inkWidth={inkWidth}
              tool={tool}
              enabled={drawingEnabled}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
