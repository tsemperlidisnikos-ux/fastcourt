"use client";

import { EditDrawToolbarIcon } from "@/components/designer/EditDrawToolbarIcon";
import { WHITEBOARD_INK_COLORS } from "@/lib/designer/constants";
import { useDesignerStore } from "@/stores/designer-store";
import { appConfirm } from "@/stores/dialog-store";

interface Props {
  inline?: boolean;
}

export function CourtWhiteboardToolbar({ inline }: Props) {
  const tool = useDesignerStore((s) => s.tool);
  const setTool = useDesignerStore((s) => s.setTool);
  const inkColor = useDesignerStore((s) => s.whiteboardInkColor);
  const inkMode = useDesignerStore((s) => s.whiteboardInkMode);
  const setInkColor = useDesignerStore((s) => s.setWhiteboardInkColor);
  const setInkMode = useDesignerStore((s) => s.setWhiteboardInkMode);
  const clearWhiteboardStrokes = useDesignerStore((s) => s.clearWhiteboardStrokes);

  const whiteboardActive = tool === "whiteboard";

  function toggleWhiteboard() {
    setTool(whiteboardActive ? "select" : "whiteboard");
  }

  const content = (
    <>
      {!inline ? null : <span className="ds-fd-tb-sep" aria-hidden="true" />}
      <button
        type="button"
        className={`ds-fd-tb-btn${whiteboardActive ? " is-active" : ""}`}
        id="btn-fd-tb-whiteboard"
        title="Whiteboard — draw freely on court"
        aria-label="Whiteboard"
        aria-pressed={whiteboardActive}
        onClick={toggleWhiteboard}
      >
        <span className="ds-fd-tb-icon ds-whiteboard-icon" aria-hidden="true">
          <EditDrawToolbarIcon />
        </span>
      </button>
      <div
        className={`ds-fd-whiteboard-colors${whiteboardActive ? " is-visible" : ""}`}
        id="ds-fd-whiteboard-colors"
        aria-label="Whiteboard ink color"
        hidden={!whiteboardActive}
      >
        <span className="ds-fd-whiteboard-colors-label">Ink</span>
        <div
          className="ds-properties-color-swatches ds-fd-whiteboard-color-swatches"
          id="ds-fd-whiteboard-color-swatches"
          role="listbox"
          aria-label="Whiteboard ink color"
        >
          {WHITEBOARD_INK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`ds-color-swatch${inkColor === color ? " active" : ""}`}
              data-color={color}
              style={{ "--swatch": color } as React.CSSProperties}
              aria-label={color}
              title={color}
              onClick={() => setInkColor(color)}
            />
          ))}
          <button
            type="button"
            className="ds-color-swatch ds-color-swatch-custom"
            data-color-custom-trigger
            aria-label="Custom color"
            title="Custom color"
            style={
              !WHITEBOARD_INK_COLORS.includes(
                inkColor as (typeof WHITEBOARD_INK_COLORS)[number],
              )
                ? ({ "--swatch": inkColor } as React.CSSProperties)
                : undefined
            }
            onClick={() => {
              const input = document.createElement("input");
              input.type = "color";
              input.value = inkColor;
              input.onchange = () => setInkColor(input.value);
              input.click();
            }}
          />
        </div>
      </div>
      <button
        type="button"
        className={`ds-fd-tb-btn ds-fd-whiteboard-eraser-btn${inkMode === "erase" ? " is-active" : ""}`}
        id="btn-fd-tb-whiteboard-eraser"
        title="Eraser"
        aria-label="Whiteboard eraser"
        aria-pressed={inkMode === "erase"}
        hidden={!whiteboardActive}
        onClick={() =>
          setInkMode(inkMode === "erase" ? "draw" : "erase")
        }
      >
        <span className="ds-fd-tb-icon" aria-hidden="true">
          ⌫
        </span>
      </button>
      <button
        type="button"
        className="ds-fd-tb-btn ds-fd-whiteboard-clear-btn"
        id="btn-fd-tb-whiteboard-clear"
        title="Clear whiteboard drawing"
        aria-label="Clear whiteboard"
        hidden={!whiteboardActive}
        onClick={async () => {
          const ok = await appConfirm({
            title: "Clear whiteboard",
            message: "Clear whiteboard ink on this frame?",
            confirmLabel: "Clear",
            danger: true,
          });
          if (ok) clearWhiteboardStrokes();
        }}
      >
        ✕
      </button>
    </>
  );

  if (inline) {
    return (
      <div
        className={whiteboardActive ? "ds-fd-whiteboard-inline is-whiteboard-active" : "ds-fd-whiteboard-inline"}
        aria-label="Whiteboard"
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={`ds-fd-court-toolbar ds-fd-court-toolbar-secondary${whiteboardActive ? " is-whiteboard-active" : ""}`}
      aria-label="Whiteboard"
    >
      {content}
    </div>
  );
}
