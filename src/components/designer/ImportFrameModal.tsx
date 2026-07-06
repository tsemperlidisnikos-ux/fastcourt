"use client";

import { createPortal } from "react-dom";
import { useMemo, useState, useEffect } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import type { LibraryItem } from "@/types/library";
import type { StoredPlay } from "@/types/library";

interface Props {
  open: boolean;
  items: LibraryItem[];
  getPlayDocument: (id: string) => Promise<StoredPlay | undefined>;
  onClose: () => void;
  onImport: (frame: StoredPlay["frames"][number]) => void;
  /** Skip play search — open directly on this play's frames. */
  initialPlayId?: string | null;
  title?: string;
}

export function ImportFrameModal(props: Props) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  return <ImportFrameModalBody {...props} />;
}

function ImportFrameModalBody({
  items,
  getPlayDocument,
  onClose,
  onImport,
  initialPlayId = null,
  title = "Import frame from library",
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameCount, setFrameCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.type !== "playbook" &&
        (!q || item.title.toLowerCase().includes(q)),
    );
  }, [items, query]);

  async function pickPlay(id: string) {
    setSelectedId(id);
    setError("");
    setLoading(true);
    try {
      const play = await getPlayDocument(id);
      if (!play?.frames.length) {
        setError("Could not load source play.");
        setSelectedId(null);
        return;
      }
      setFrameCount(play.frames.length);
      setFrameIndex(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialPlayId) return;
    void pickPlay(initialPlayId);
  }, [initialPlayId]);

  async function handleImport() {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const play = await getPlayDocument(selectedId);
      const frame = play?.frames[frameIndex];
      if (!frame) {
        setError("Invalid frame selection.");
        return;
      }
      onImport(JSON.parse(JSON.stringify(frame)));
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="modal-overlay active fc-playbook-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box modal-box-wide fc-add-play-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-frame-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="import-frame-modal-title">
          {title}
        </div>
        <p className="modal-subtitle">
          Pick a play, then choose which frame to copy into the current frame.
        </p>
        {!selectedId ? (
          <>
            <div className="modal-field fc-playbook-dialog-field">
              <label htmlFor="import-frame-search">
                <span className="fc-playbook-dialog-label">Search plays</span>
                <input
                  id="import-frame-search"
                  type="search"
                  value={query}
                  placeholder="Search by play name…"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="fc-import-frame-list">
              {!filtered.length ? (
                <div className="fc-add-play-modal-empty">No plays found.</div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="fc-import-frame-item"
                    disabled={loading}
                    onClick={() => void pickPlay(item.id)}
                  >
                    <span className="fc-import-frame-item-title">{item.title}</span>
                    <span className="fc-import-frame-item-meta">
                      {item.team || "No team"} · {item.frameCount} frame
                      {item.frameCount === 1 ? "" : "s"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="fc-import-frame-step-two">
            <p className="modal-subtitle">
              Selected:{" "}
              <strong>
                {filtered.find((i) => i.id === selectedId)?.title ?? "Play"}
              </strong>
            </p>
            {frameCount > 1 ? (
              <div className="modal-field fc-playbook-dialog-field">
                <label htmlFor="import-frame-index">
                  <span className="fc-playbook-dialog-label">
                    Frame number (1–{frameCount})
                  </span>
                  <input
                    id="import-frame-index"
                    type="number"
                    min={1}
                    max={frameCount}
                    value={frameIndex + 1}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) {
                        setFrameIndex(
                          Math.min(frameCount - 1, Math.max(0, n - 1)),
                        );
                      }
                    }}
                  />
                </label>
              </div>
            ) : null}
            <button
              type="button"
              className="fc-import-frame-back"
              onClick={() => setSelectedId(null)}
            >
              ← Choose another play
            </button>
          </div>
        )}
        {error ? (
          <p className="fc-playbook-dialog-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          {selectedId ? (
            <button
              type="button"
              className="modal-create"
              disabled={loading}
              onClick={() => void handleImport()}
            >
              {loading ? "…" : "Import frame"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
