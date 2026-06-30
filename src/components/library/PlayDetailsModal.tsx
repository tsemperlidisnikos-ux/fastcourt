"use client";

import { createPortal } from "react-dom";
import { useMemo, useState, type KeyboardEvent } from "react";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { CourtSettingsPanel } from "@/components/designer/CourtSettingsPanel";
import { VideoEmbed, VideoProviderBadge } from "@/components/library/VideoEmbed";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  DEFAULT_NEW_PLAY_COURT_VIEW,
  mergeCourtViewSettings,
  patchCourtViewSettings,
} from "@/lib/designer/court-view-settings";
import { createFrame } from "@/lib/designer/play-factory";
import { isValidVideoUrl, parseVideoUrl } from "@/lib/library/video-url";
import {
  defaultTagColorForIndex,
  resolveTagColor,
  TAG_COLOR_PALETTE,
} from "@/lib/library/tag-colors";
import { contrastingTextOnBackground } from "@/lib/settings/color-contrast";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { CourtType, CourtViewSettings } from "@/types/designer";
import type { LibraryItemType, PlayDetailsValues } from "@/types/library";

export type { PlayDetailsValues };

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<PlayDetailsValues>;
  onClose: () => void;
  onSubmit: (values: PlayDetailsValues) => void | Promise<void>;
}

function normalizeTag(value: string) {
  return value.trim().replace(/,+$/, "");
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function buildFormState(
  initial: Partial<PlayDetailsValues> | undefined,
  teams: string[],
  seriesList: string[],
  seasons: string[],
) {
  const nextType = initial?.type ?? "play";
  return {
    type: nextType,
    title: initial?.title ?? "",
    team: initial?.team ?? teams[0] ?? "No Team",
    series:
      initial?.series ??
      (nextType === "drill" ? "Drill" : (seriesList[0] ?? "Offense")),
    selectedTags: uniqueTags(initial?.tags ?? []),
    courtType: initial?.courtType ?? "half",
    courtView: mergeCourtViewSettings(
      initial?.courtView ?? DEFAULT_NEW_PLAY_COURT_VIEW,
    ),
    season: initial?.season ?? seasons[0] ?? "Default",
    playNotes: initial?.playNotes ?? "",
    videoUrl: initial?.videoUrl ?? "",
  };
}

const PREVIEW_FRAME = createFrame("Preview", 1);

export function PlayDetailsModal(props: Props) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  const initialKey = JSON.stringify(props.initial ?? {});
  return (
    <PlayDetailsModalBody
      key={`${props.mode}:${initialKey}`}
      {...props}
    />
  );
}

function PlayDetailsModalBody({
  mode,
  initial,
  onClose,
  onSubmit,
}: Props) {
  const seasons = useOrganizerStore((s) => s.seasons);
  const teams = useOrganizerStore((s) => s.teams);
  const seriesList = useOrganizerStore((s) => s.series);
  const fieldTags = useOrganizerStore((s) => s.fieldTags);
  const fieldTagColors = useOrganizerStore((s) => s.fieldTagColors);
  const addField = useOrganizerStore((s) => s.addField);
  const setTagColor = useOrganizerStore((s) => s.setTagColor);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const defaults = buildFormState(initial, teams, seriesList, seasons);
  const [type, setType] = useState<LibraryItemType>(defaults.type);
  const [title, setTitle] = useState(defaults.title);
  const [team, setTeam] = useState(defaults.team);
  const [series, setSeries] = useState(defaults.series);
  const [selectedTags, setSelectedTags] = useState<string[]>(defaults.selectedTags);
  const [tagDraft, setTagDraft] = useState("");
  const [tagDraftColor, setTagDraftColor] = useState<string>(() =>
    defaultTagColorForIndex(defaults.selectedTags.length),
  );
  const [colorEditTag, setColorEditTag] = useState<string | null>(null);
  const [courtType, setCourtType] = useState<CourtType>(defaults.courtType);
  const [courtView, setCourtView] = useState<CourtViewSettings>(defaults.courtView);
  const [season, setSeason] = useState(defaults.season);
  const [playNotes, setPlayNotes] = useState(defaults.playNotes);
  const [videoUrl, setVideoUrl] = useState(defaults.videoUrl);

  const isDrill = type === "drill";
  const modalTitle = isDrill ? "Drill Details" : "Play Details";
  const confirmLabel =
    mode === "edit" ? "Save" : isDrill ? "Create Drill" : "Create Play";

  const tagOptions = useMemo(
    () => Array.from(new Set([...fieldTags, ...selectedTags])),
    [fieldTags, selectedTags],
  );
  const parsedVideo = useMemo(() => parseVideoUrl(videoUrl), [videoUrl]);

  function patchCourtView(patch: Partial<CourtViewSettings>) {
    setCourtView((prev) => patchCourtViewSettings(prev, patch));
  }

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
        tags: selectedTags,
        courtType,
        courtView,
        season: season || seasons[0] || "Default",
        playNotes: playNotes.trim(),
        videoUrl: videoUrl.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function addTagsToSelection(candidates: string[], color?: string) {
    const normalized = uniqueTags(candidates.map(normalizeTag).filter(Boolean));
    if (!normalized.length) return;
    for (let i = 0; i < normalized.length; i++) {
      const tag = normalized[i]!;
      const tagColor =
        i === 0 && color
          ? color
          : defaultTagColorForIndex(selectedTags.length + i);
      await addField("tags", tag);
      await setTagColor(tag, tagColor);
    }
    setSelectedTags((prev) => uniqueTags([...prev, ...normalized]));
    setColorEditTag(null);
  }

  async function handleAddTag() {
    const candidate = normalizeTag(tagDraft);
    if (!candidate) return;
    await addTagsToSelection([candidate], tagDraftColor);
    setTagDraft("");
    setTagDraftColor(defaultTagColorForIndex(selectedTags.length + 1));
  }

  function handleTagColorPick(color: string) {
    setTagDraftColor(color);
    if (colorEditTag) {
      void setTagColor(colorEditTag, color);
    }
  }

  function handleSelectTagForColor(tag: string) {
    if (colorEditTag?.toLowerCase() === tag.toLowerCase()) {
      setColorEditTag(null);
      return;
    }
    setColorEditTag(tag);
    setTagDraftColor(resolveTagColor(tag, fieldTagColors));
  }

  function handleRemoveTag(tag: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
    if (colorEditTag?.toLowerCase() === tag.toLowerCase()) {
      setColorEditTag(null);
    }
  }

  function handleTagDraftChange(value: string) {
    if (!value.includes(",")) {
      setTagDraft(value);
      return;
    }
    const parts = value.split(",");
    const pending = parts.pop() ?? "";
    const ready = parts.map(normalizeTag).filter(Boolean);
    if (ready.length) void addTagsToSelection(ready, tagDraftColor);
    setTagDraft(pending);
  }

  function handleTagDraftKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleAddTag();
      return;
    }
    if (e.key === "Backspace" && !tagDraft && selectedTags.length) {
      setSelectedTags((prev) => prev.slice(0, -1));
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
          <div className="play-details-meta-grid">
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
            <div className="play-details-field play-details-field-wide">
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
                  {selectedTags.map((tag) => {
                    const background = resolveTagColor(tag, fieldTagColors);
                    const isColorActive =
                      colorEditTag?.toLowerCase() === tag.toLowerCase();
                    return (
                    <span
                      key={tag}
                      className={`play-details-tag-chip${isColorActive ? " is-color-active" : ""}`}
                      style={{
                        backgroundColor: background,
                        color: contrastingTextOnBackground(background),
                      }}
                    >
                      <button
                        type="button"
                        className="play-details-tag-chip-label"
                        aria-label={`Edit color for tag ${tag}`}
                        aria-pressed={isColorActive}
                        onClick={() => handleSelectTagForColor(tag)}
                      >
                        {tag}
                      </button>
                      <button
                        type="button"
                        className="play-details-tag-chip-remove"
                        aria-label={`Remove tag ${tag}`}
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </span>
                    );
                  })}
                  <input
                    type="text"
                    id="new-play-tags"
                    list="new-play-tags-list"
                    placeholder={selectedTags.length ? "Add another tag…" : "Select Tags"}
                    autoComplete="off"
                    value={tagDraft}
                    onChange={(e) => handleTagDraftChange(e.target.value)}
                    onKeyDown={handleTagDraftKeyDown}
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
              <div className="play-details-tag-colors" role="radiogroup" aria-label="Tag color">
                {TAG_COLOR_PALETTE.map((swatch) => (
                  <button
                    key={swatch.id}
                    type="button"
                    className={`play-details-tag-color-swatch${tagDraftColor === swatch.value ? " is-active" : ""}`}
                    style={{ backgroundColor: swatch.value }}
                    title={swatch.label}
                    aria-label={swatch.label}
                    aria-pressed={tagDraftColor === swatch.value}
                    onClick={() => handleTagColorPick(swatch.value)}
                  />
                ))}
              </div>
              {colorEditTag ? (
                <p className="play-details-tag-color-hint">
                  Editing color for <strong>{colorEditTag}</strong>. Click the tag again to deselect.
                </p>
              ) : (
                <p className="play-details-tag-color-hint">
                  Pick a color, then add a tag — or click a tag to change its color.
                </p>
              )}
              <datalist id="new-play-tags-list">
                {tagOptions
                  .filter(
                    (tag) =>
                      !selectedTags.some((selected) => selected.toLowerCase() === tag.toLowerCase()),
                  )
                  .map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
              </datalist>
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
            <div className="play-details-field">
              <label htmlFor="new-play-video-url">Video link</label>
              <input
                type="url"
                id="new-play-video-url"
                placeholder="YouTube, Vimeo, Hudl, or .mp4"
                autoComplete="off"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="play-details-court-section">
            <div className="play-details-court-settings fc-court-settings">
              <CourtSettingsPanel
                courtType={courtType}
                courtView={courtView}
                onCourtTypeChange={setCourtType}
                onCourtViewChange={patchCourtView}
              />
            </div>
            <div className="play-details-preview">
              <CourtFrameThumbnail
                courtType={courtType}
                frame={PREVIEW_FRAME}
                courtView={courtView}
                courtTemplate={courtView.template}
                size="sm"
                alt="Court preview"
              />
            </div>
          </div>

          {parsedVideo ? (
            <div className="play-details-video-preview play-details-field-wide">
              <VideoProviderBadge parsed={parsedVideo} />
              {parsedVideo.embedUrl ? (
                <VideoEmbed
                  videoUrl={videoUrl}
                  title={title.trim() || modalTitle}
                  compact
                />
              ) : (
                <p className="play-details-hint">
                  Preview opens on {parsedVideo.providerLabel} when players tap Watch video.
                </p>
              )}
            </div>
          ) : null}
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
