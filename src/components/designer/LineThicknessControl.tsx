"use client";

import { useDesignerStore } from "@/stores/designer-store";

export function LineThicknessControl() {
  const thickness = useDesignerStore((s) => s.lineThickness);
  const setThickness = useDesignerStore((s) => s.setLineThickness);

  return (
    <div className="ds-designer-color-panel" id="ds-designer-color-panel">
      <div className="ds-properties-color-panel" id="ds-properties-color-panel">
        <div className="ds-prop-section ds-prop-thickness-section" id="ds-prop-draw-section">
          <div className="ds-options-sub">
            <div className="ds-options-label">Line thickness</div>
            <input
              type="range"
              id="tool-thickness"
              min={1}
              max={8}
              value={thickness}
              aria-label="Line thickness"
              onChange={(e) => setThickness(Number(e.target.value))}
            />
            <span className="ds-options-value">{thickness}px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
