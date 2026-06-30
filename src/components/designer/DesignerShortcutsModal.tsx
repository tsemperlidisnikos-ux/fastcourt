"use client";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "V / Esc", action: "Select tool" },
  { keys: "O / P", action: "Offense player" },
  { keys: "X", action: "Defense player" },
  { keys: "L / F / D", action: "Line tool" },
  { keys: "S", action: "Shot line (Line tool)" },
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Shift+Z", action: "Redo" },
  { keys: "Ctrl+Shift+M", action: "Mirror frame" },
  { keys: "?", action: "This help" },
];

export function DesignerShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="designer-shortcuts-overlay"
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-labelledby="designer-shortcuts-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 24px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
        }}
      >
        <h2
          id="designer-shortcuts-title"
          style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}
        >
          Keyboard shortcuts
        </h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {SHORTCUTS.map((row) => (
            <li
              key={row.keys}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "8px 0",
                borderBottom: "1px solid #e2e8f0",
                fontSize: 14,
              }}
            >
              <kbd
                style={{
                  fontFamily: "inherit",
                  background: "#f1f5f9",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {row.keys}
              </kbd>
              <span>{row.action}</span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button type="button" className="ds-fd-done-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
