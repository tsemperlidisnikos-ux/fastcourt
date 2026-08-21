"use client";

import { useRef, useState, type DragEvent } from "react";
import { useFilmRoomStore } from "@/stores/film-room-store";

const ACCEPT =
  "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|mov)$/i.test(file.name);
}

function friendlyUploadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/quota| QuotaExceeded|storage/i.test(message)) {
    return "Not enough browser storage for this clip. Try a shorter MP4 or delete old sessions.";
  }
  if (/too large|file size|max/i.test(message)) {
    return message;
  }
  return message || "Upload failed.";
}

export function FilmRoomNewSessionPanel({ onCreated }: { onCreated?: () => void }) {
  const createUploadSession = useFilmRoomStore((s) => s.createUploadSession);

  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleUpload(file: File) {
    if (!isVideoFile(file)) {
      setError("Use an MP4, WebM, or MOV video file.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createUploadSession(file, title);
      setTitle("");
      onCreated?.();
    } catch (e) {
      setError(friendlyUploadError(e));
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleUpload(file);
  }

  return (
    <div className="fc-film-new-panel">
      <h3 className="fc-film-new-title">New film session</h3>

      <label className="fc-film-field">
        <span>Title (optional)</span>
        <input
          type="text"
          value={title}
          placeholder="e.g. Pick and roll breakdown"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <div
        className={`fc-film-upload-block${dragOver ? " is-dragover" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="fc-film-file-input"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
        <p className="fc-film-drop-hint">
          {dragOver ? "Drop video to upload" : "Drag & drop an MP4 here"}
        </p>
        <button
          type="button"
          className="fc-film-sidebar-btn fc-film-sidebar-btn-primary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Saving…" : "Upload MP4"}
        </button>
        <p className="fc-film-upload-note">Stored locally in your browser.</p>
      </div>

      {error ? <p className="fc-film-error">{error}</p> : null}
    </div>
  );
}
