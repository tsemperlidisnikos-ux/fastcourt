"use client";

import { useRef, useState } from "react";
import { filmRoomSourceFromUrl } from "@/lib/film-room/film-room-source";
import { useFilmRoomStore } from "@/stores/film-room-store";

type SourceTab = "upload" | "youtube";

export function FilmRoomNewSessionPanel({ onCreated }: { onCreated?: () => void }) {
  const createUploadSession = useFilmRoomStore((s) => s.createUploadSession);
  const createUrlSession = useFilmRoomStore((s) => s.createUrlSession);

  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<SourceTab>("upload");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      await createUploadSession(file, title);
      setTitle("");
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleYoutube() {
    const source = filmRoomSourceFromUrl(url);
    if (!source) {
      setError("Paste a valid YouTube or direct MP4 URL.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createUrlSession(
        source,
        title || (source.kind === "youtube" ? "YouTube clip" : "Video clip"),
      );
      setTitle("");
      setUrl("");
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create session.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fc-film-new-panel">
      <h3 className="fc-film-new-title">New film session</h3>
      <div className="fc-film-new-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upload"}
          className={tab === "upload" ? "is-active" : ""}
          onClick={() => setTab("upload")}
        >
          Upload MP4
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "youtube"}
          className={tab === "youtube" ? "is-active" : ""}
          onClick={() => setTab("youtube")}
        >
          YouTube / URL
        </button>
      </div>

      <label className="fc-film-field">
        <span>Title (optional)</span>
        <input
          type="text"
          value={title}
          placeholder="e.g. Pick and roll breakdown"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      {tab === "upload" ? (
        <div className="fc-film-upload-block">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="fc-film-file-input"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="fc-film-sidebar-btn fc-film-sidebar-btn-primary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Saving…" : "Choose video file"}
          </button>
          <p className="fc-film-upload-note">Stored locally in your browser.</p>
        </div>
      ) : (
        <div className="fc-film-url-block">
          <label className="fc-film-field">
            <span>YouTube or MP4 link</span>
            <input
              type="url"
              value={url}
              placeholder="https://youtube.com/watch?v=…"
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="fc-film-sidebar-btn fc-film-sidebar-btn-primary"
            disabled={busy || !url.trim()}
            onClick={() => void handleYoutube()}
          >
            {busy ? "Creating…" : "Add video"}
          </button>
        </div>
      )}

      {error ? <p className="fc-film-error">{error}</p> : null}
    </div>
  );
}
