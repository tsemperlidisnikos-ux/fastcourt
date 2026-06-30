"use client";

import { CourtSettingsPanel } from "@/components/designer/CourtSettingsPanel";
import { useDesignerStore } from "@/stores/designer-store";

interface ExportHandlers {
  exportingAnim?: boolean;
  onShareLink: () => void;
  onExportVideo: () => void;
  onExportImages: () => void;
  onEmbedCode: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

export function DesignerCourtSettingsMenu({
  open,
  exportHandlers,
}: {
  open: boolean;
  exportHandlers?: ExportHandlers;
}) {
  const courtType = useDesignerStore((s) => s.play.courtType);
  const courtView = useDesignerStore((s) => s.play.courtView);
  const setCourtType = useDesignerStore((s) => s.setCourtType);
  const setCourtView = useDesignerStore((s) => s.setCourtView);

  if (!open) return null;

  return (
    <div
      className="ds-fd-court-settings-menu"
      role="dialog"
      aria-label="Court settings"
      onClick={(e) => e.stopPropagation()}
    >
      <CourtSettingsPanel
        courtType={courtType}
        courtView={courtView}
        onCourtTypeChange={setCourtType}
        onCourtViewChange={setCourtView}
      />

      {exportHandlers ? (
        <>
          <div className="ds-fd-court-settings-sep" />
          <div className="ds-fd-court-settings-export">
            <span className="ds-fd-court-settings-label">Share &amp; export</span>
            <div className="ds-fd-court-settings-export-grid">
              <button type="button" onClick={exportHandlers.onShareLink}>
                Link
              </button>
              <button
                type="button"
                disabled={exportHandlers.exportingAnim}
                title="Export play animation as MP4 video"
                onClick={exportHandlers.onExportVideo}
              >
                MP4
              </button>
              <button type="button" onClick={exportHandlers.onExportImages}>
                Images
              </button>
              <button type="button" onClick={exportHandlers.onEmbedCode}>
                Embed
              </button>
              <button type="button" onClick={exportHandlers.onDownload}>
                Download
              </button>
              <button type="button" onClick={exportHandlers.onPrint}>
                Print
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
