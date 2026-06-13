"use client";

import { useRef, useState } from "react";
import { readLogoDataUrl } from "@/lib/settings/logo-image";

export function ClubLogoUpload({
  logoDataUrl,
  onChange,
  label = "Club / team logo",
  hint,
  defaultPreviewSrc,
  removeLabel = "Remove",
  previewAlt = "Logo",
}: {
  logoDataUrl: string | null;
  onChange: (dataUrl: string | null) => boolean | void;
  label?: string;
  hint?: string;
  defaultPreviewSrc?: string;
  removeLabel?: string;
  previewAlt?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openFilePicker() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await readLogoDataUrl(file);
      const saved = onChange(dataUrl);
      if (saved === false) {
        setError("Could not save the logo. Try a smaller image file.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    if (busy) return;
    setError(null);
    const saved = onChange(null);
    if (saved === false) {
      setError("Could not remove the logo.");
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewSrc = logoDataUrl ?? defaultPreviewSrc ?? null;
  const hasCustomLogo = logoDataUrl != null && logoDataUrl.length > 0;

  return (
    <div className="org-settings-brand-logo">
      <span>{label}</span>
      {hint ? <p className="org-settings-hint">{hint}</p> : null}
      <div className="playbook-logo-row">
        <div className="playbook-logo-preview">
          {previewSrc ? (
            <img src={previewSrc} alt={previewAlt} className="app-logo-preview-img" />
          ) : (
            <span className="playbook-logo-placeholder">No logo</span>
          )}
        </div>
        <div className="playbook-logo-actions">
          <button
            type="button"
            className="playbook-plays-tool-btn"
            disabled={busy}
            onClick={openFilePicker}
          >
            {busy ? "Uploading…" : hasCustomLogo ? "Change logo" : "Upload logo"}
          </button>
          {hasCustomLogo ? (
            <button
              type="button"
              className="playbook-plays-tool-btn"
              disabled={busy}
              onClick={handleRemove}
            >
              {removeLabel}
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/*"
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: "none" }}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {error ? (
        <p className="org-settings-upload-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
