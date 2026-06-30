"use client";

import { LINE_DRAW_COLORS } from "@/lib/designer/constants";
import { useDesignerStore } from "@/stores/designer-store";

export function LineColorControl() {
  const lineColor = useDesignerStore((s) => s.lineColor);
  const setLineColor = useDesignerStore((s) => s.setLineColor);
  const selectedActionId = useDesignerStore((s) => s.selectedActionId);
  const selectedAction = useDesignerStore((s) => {
    const frame = s.play.frames[s.currentFrameIndex];
    if (!s.selectedActionId || !frame) return null;
    return frame.actions.find((action) => action.id === s.selectedActionId) ?? null;
  });
  const updateAction = useDesignerStore((s) => s.updateAction);

  const activeColor = selectedAction?.color ?? lineColor;

  function pickColor(color: string) {
    setLineColor(color);
    if (selectedActionId && selectedAction) {
      updateAction(selectedActionId, { color }, { recordUndo: true });
    }
  }

  function pickCustomColor() {
    const input = document.createElement("input");
    input.type = "color";
    input.value = activeColor;
    input.onchange = () => pickColor(input.value);
    input.click();
  }

  return (
    <div className="ds-designer-color-panel" id="ds-designer-color-panel">
      <div className="ds-properties-color-panel" id="ds-properties-color-panel">
        <div className="ds-prop-section ds-prop-color-section" id="ds-prop-draw-section">
          <div className="ds-options-sub ds-line-color-sub">
            <div
              className="ds-properties-color-swatches ds-sidebar-color-swatches"
              id="ds-sidebar-color-swatches"
              role="listbox"
              aria-label="Line color"
            >
              {LINE_DRAW_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`ds-color-swatch${activeColor === color ? " active" : ""}`}
                  data-color={color}
                  style={
                    {
                      "--swatch": color,
                      backgroundColor: color,
                    } as React.CSSProperties
                  }
                  aria-label={color}
                  title={color}
                  aria-selected={activeColor === color}
                  onClick={() => pickColor(color)}
                />
              ))}
              <button
                type="button"
                className="ds-color-swatch ds-color-swatch-custom"
                data-color-custom-trigger
                aria-label="Custom color"
                title="Custom color"
                style={
                  !LINE_DRAW_COLORS.includes(
                    activeColor as (typeof LINE_DRAW_COLORS)[number],
                  )
                    ? ({
                        "--swatch": activeColor,
                        backgroundColor: activeColor,
                      } as React.CSSProperties)
                    : undefined
                }
                onClick={pickCustomColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
