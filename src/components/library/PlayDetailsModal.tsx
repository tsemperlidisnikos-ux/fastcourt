"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { courtImagePath } from "@/lib/designer/court-assets";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { CourtType } from "@/types/designer";
import type { LibraryItemType, PlayDetailsValues } from "@/types/library";

export type { PlayDetailsValues };

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<PlayDetailsValues>;
  onClose: () => void;
  onSubmit: (values: PlayDetailsValues) => void | Promise<void>;
}

function parseTags(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function isValidVideoUrl(raw: string) {
  if (!raw.trim()) return true;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function PlayDetailsModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const seasons = useOrganizerStore((s) => s.seasons);
  const teams = useOrganizerStore((s) => s.teams);
  const seriesList = useOrganizerStore((s) => s.series);
  const fieldTags = useOrganizerStore((s) => s.fieldTags);
  const addField = useOrganizerStore((s) => s.addField);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [type, setType] = useState<LibraryItemType>("play");
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState("");
  const [series, setSeries] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [courtType, setCourtType] = useState<CourtType>("half");
  const [season, setSeason] = useState("");
  const [playNotes, setPlayNotes] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const isDrill = type === "drill";
  const modalTitle = isDrill ? "Drill Details" : "Play Details";
  const confirmLabel =
    mode === "edit" ? "Save" : isDrill ? "Create Drill" : "Create Play";

  const tagOptions = useMemo(
    () => Array.from(new Set([...fieldTags, ...parseTags(tagsText)])),
    [fieldTags, tagsText],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const nextType = initial?.type ?? "play";
    setType(nextType);
    setTitle(initial?.title ?? "");
    setTeam(initial?.team ?? teams[0] ?? "No Team");
    setSeries(
      initial?.series ??
        (nextType === "drill" ? "Drill" : seriesList[0] ?? "Offense"),
    );
    setTagsText((initial?.tags ?? []).join(", "));
    setCourtType(initial?.courtType ?? "half");
    setSeason(initial?.season ?? seasons[0] ?? "Default");
    setPlayNotes(initial?.playNotes ?? "");
    setVideoUrl(initial?.videoUrl ?? "");
    setFormError("");
  }, [open, initial, teams, seriesList, seasons]);

  if (!open || !mounted) return null;

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("Please enter a name.");
      return;
    }
    if (!isValidVideoUrl(videoUrl)) {
      setFormError("Please enter a valid https video link.");
      return;
    }
    setFormError("");

    setSubmitting(true);
    try {
      await onSubmit({
        type,
        title: trimmedTitle,
        team: team || teams[0] || "No Team",
        series: series || "",
        tags: parseTags(tagsText),
        courtType,
        season: season || seasons[0] || "Default",
        playNotes: playNotes.trim(),
        videoUrl: videoUrl.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddTag() {
    const candidate = tagsText.split(",").pop()?.trim() ?? "";
    if (!candidate) return;
    await addField("tags", candidate);
    const existing = parseTags(tagsText);
    if (!existing.includes(candidate)) {
      setTagsText(existing.length ? `${existing.join(", ")}, ${candidate}` : candidate);
    }
  }

  return createPortal(
    <div
      id="new-play-modal"
      className="modal-overlay play-details-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box play-details-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-play-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="play-details-modal-head">
          <div className="modal-title play-details-modal-title" id="new-play-modal-title">
            {modalTitle}
          </div>
          <button
            type="button"
            className="play-details-modal-close"
            id="close-new-play-modal"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {formError ? (
          <p className="fc-playbook-dialog-error play-details-form-error" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="play-details-modal-body">
          <div className="play-details-form">
            <div className="play-details-field play-details-field-wide play-details-kind-field">
              <span className="play-details-field-label">
                Type <span className="play-details-required">*</span>
              </span>
              <div className="play-details-kind-row" role="radiogroup" aria-label="Diagram type">
                <label className="play-details-kind-option">
                  <input
                    type="radio"
                    name="new-play-content-kind"
                    value="play"
                    checked={type === "play"}
                    onChange={() => {
                      setType("play");
                      if (!series || series === "Drill") setSeries(seriesList[0] ?? "Offense");
                    }}
                  />
                  <span>Play</span>
                </label>
                <label className="play-details-kind-option">
                  <input
                    type="radio"
                    name="new-play-content-kind"
                    value="drill"
                    checked={type === "drill"}
                    onChange={() => {
                      setType("drill");
                      if (!series || series === "Offense") setSeries("Drill");
                    }}
                  />
                  <span>Drill</span>
                </label>
              </div>
            </div>
            <div className="play-details-field">
              <label htmlFor="new-play-name">
                Play Name <span className="play-details-required">*</span>
              </label>
              <input
                type="text"
                id="new-play-name"
                placeholder="Play #1"
                autoComplete="off"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="play-details-field">
              <label htmlFor="new-play-team">Team</label>
              <select
                id="new-play-team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="play-details-field">
              <label htmlFor="new-play-category">Series</label>
              <select
                id="new-play-category"
                value={series}
                onChange={(e) => setSeries(e.target.value)}
              >
                {(seriesList.length ? seriesList : ["Offense", "Drill", "General"]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="play-details-field">
              <label htmlFor="new-play-tags">Tags</label>
              <div className="play-details-tags-row">
                <div className="play-details-tags-input-wrap">
                  <span className="play-details-tags-search" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="currentColor"
                        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    id="new-play-tags"
                    list="new-play-tags-list"
                    placeholder="Select Tags"
                    autoComplete="off"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="play-details-tags-add"
                  id="btn-new-play-add-tag"
                  title="Add tag"
                  onClick={() => void handleAddTag()}
                >
                  +
                </button>
              </div>
              <datalist id="new-play-tags-list">
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </div>
            <div className="play-details-field">
              <label htmlFor="new-play-court-type">Court Type</label>
              <select
                id="new-play-court-type"
                value={courtType}
                onChange={(e) => setCourtType(e.target.value as CourtType)}
              >
                <option value="half">Half Court</option>
                <option value="full">Full Court</option>
              </select>
            </div>
            <div className="play-details-field">
              <label htmlFor="new-play-season">Season</label>
              <select
                id="new-play-season"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="play-details-field">
              <label htmlFor="new-play-notes">Play Notes</label>
              <input
                type="text"
                id="new-play-notes"
                placeholder="Play Notes"
                autoComplete="off"
                value={playNotes}
                onChange={(e) => setPlayNotes(e.target.value)}
              />
            </div>
            <div className="play-details-field play-details-field-wide">
              <label htmlFor="new-play-video-url">Video link</label>
              <input
                type="url"
                id="new-play-video-url"
                placeholder="YouTube, Vimeo, or https:// video link"
                autoComplete="off"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <p className="play-details-hint">
                Shown in Present mode, player links, and Playbook PDF QR code.
              </p>
            </div>
          </div>
          <div className="play-details-preview">
            <img
              id="new-play-court-preview"
              src={courtImagePath(courtType)}
              alt="Court preview"
            />
          </div>
        </div>
        <div className="play-details-modal-foot modal-actions">
          <button
            type="button"
            className="play-details-cancel modal-cancel"
            id="cancel-new-play"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="play-details-save modal-create"
            id="confirm-new-play"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
