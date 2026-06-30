"use client";

const ZOOM_STEPS = [50, 60, 70, 80, 90, 100, 110, 125, 150] as const;

interface Props {
  zoomPct: number;
  onZoomChange: (pct: number) => void;
}

export function PlaybookPreviewToolbar({ zoomPct, onZoomChange }: Props) {
  function stepZoom(delta: number) {
    const idx = ZOOM_STEPS.findIndex((step) => step >= zoomPct);
    const base = idx === -1 ? ZOOM_STEPS.length - 1 : idx;
    const next = Math.min(
      ZOOM_STEPS.length - 1,
      Math.max(0, base + delta),
    );
    onZoomChange(ZOOM_STEPS[next] ?? 100);
  }

  return (
    <div
      className="fc-playbooks-preview-toolbar"
      id="fc-playbooks-preview-toolbar"
      aria-label="Preview zoom controls"
    >
      <div className="fc-playbooks-preview-toolbar-zoom">
        <button
          type="button"
          className="fc-playbooks-preview-tool-btn"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={zoomPct <= ZOOM_STEPS[0]}
          onClick={() => stepZoom(-1)}
        >
          −
        </button>
        <span className="fc-playbooks-preview-zoom-label">{zoomPct}%</span>
        <button
          type="button"
          className="fc-playbooks-preview-tool-btn"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={zoomPct >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          onClick={() => stepZoom(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
