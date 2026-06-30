"use client";

import { useRef, useState } from "react";
import { DEFAULT_PLAYBOOK_PRINT_CONFIG } from "@/lib/library/playbook-print-config";
import {
  PLAYBOOK_GRID_COUNT_OPTIONS,
  PLAYBOOK_PAGE_NUMBER_OPTIONS,
  PLAYBOOK_PRINT_FIELD_OPTIONS,
} from "@/lib/library/playbook-print-format";
import { usePlaybookPrintConfigStore } from "@/stores/playbook-print-config-store";
import type {
  CoverVerticalAlign,
  PlaybookCoverConfig,
  PlaybookFormatOptions,
  PlaybookGridCount,
  PlaybookPageNumberPosition,
  PlaybookPrintConfig,
  PlaybookPrintFieldSource,
  PlaybookPrintFontSizes,
} from "@/types/playbook-print-config";

type TabId = "print" | "cover";

interface Props {
  onClose: () => void;
  className?: string;
  /** When false, Save keeps the panel open (e.g. print overlay side pane). */
  closeOnSave?: boolean;
}

function patchConfig(
  config: PlaybookPrintConfig,
  patch: Partial<PlaybookPrintConfig>,
): PlaybookPrintConfig {
  return { ...config, ...patch };
}

function patchCover(
  config: PlaybookPrintConfig,
  patch: Partial<PlaybookCoverConfig>,
): PlaybookPrintConfig {
  return { ...config, cover: { ...config.cover, ...patch } };
}

function patchFonts(
  config: PlaybookPrintConfig,
  patch: Partial<PlaybookPrintFontSizes>,
): PlaybookPrintConfig {
  return {
    ...config,
    fontSizes: { ...config.fontSizes, ...patch },
  };
}

function patchFormat(
  config: PlaybookPrintConfig,
  patch: Partial<PlaybookFormatOptions>,
): PlaybookPrintConfig {
  return {
    ...config,
    format: { ...config.format, ...patch },
  };
}

function NumberField({
  label,
  value,
  unit,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="fc-pb-print-field">
      <span className="fc-pb-print-field-label">{label}</span>
      <span className="fc-pb-print-field-input-wrap">
        <input
          type="number"
          className="fc-pb-print-field-input"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="fc-pb-print-field-unit">{unit}</span>
      </span>
    </label>
  );
}

function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (val: T) => void;
}) {
  return (
    <label className="fc-pb-print-select">
      <span className="fc-pb-print-select-label">{label}</span>
      <select
        className="fc-pb-print-select-input"
        value={String(value)}
        onChange={(e) => {
          const next = options.find((opt) => String(opt.value) === e.target.value);
          if (next) onChange(next.value);
        }}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PlaybookPrintSettingsPanel({
  onClose,
  className,
  closeOnSave = true,
}: Props) {
  const stored = usePlaybookPrintConfigStore((s) => s.config);
  const setStored = usePlaybookPrintConfigStore((s) => s.setConfig);
  const resetToDefaults = usePlaybookPrintConfigStore((s) => s.resetToDefaults);

  const [tab, setTab] = useState<TabId>("print");
  const [draft, setDraft] = useState<PlaybookPrintConfig>(stored);
  const [prevStored, setPrevStored] = useState(stored);
  const coverFileRef = useRef<HTMLInputElement>(null);

  if (stored !== prevStored) {
    setPrevStored(stored);
    setDraft(stored);
  }

  function handleSave() {
    setStored(draft, true);
    if (closeOnSave) onClose();
  }

  function handleRestore() {
    resetToDefaults();
    setDraft({ ...DEFAULT_PLAYBOOK_PRINT_CONFIG });
  }

  function handleCoverImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      setDraft((prev) =>
        patchCover(prev, { coverImageDataUrl: dataUrl, addCoverImage: true }),
      );
    };
    reader.readAsDataURL(file);
  }

  const alignOptions: { id: CoverVerticalAlign; label: string }[] = [
    { id: "top", label: "Top" },
    { id: "center", label: "Center" },
    { id: "bottom", label: "Bottom" },
  ];

  return (
    <section
      className={`fc-playbooks-print-settings-pane${className ? ` ${className}` : ""}`}
      id="fc-playbooks-print-settings-pane"
      aria-label="Playbook print settings"
    >
      <div className="fc-pb-print-settings">
        <div className="fc-pb-print-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "print"}
            className={`fc-pb-print-tab${tab === "print" ? " active" : ""}`}
            onClick={() => setTab("print")}
          >
            Print Settings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "cover"}
            className={`fc-pb-print-tab${tab === "cover" ? " active" : ""}`}
            onClick={() => setTab("cover")}
          >
            Cover Page
          </button>
        </div>

        {tab === "print" ? (
          <div className="fc-pb-print-tab-panel" role="tabpanel">
            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Paper Size</h3>
              <div className="fc-pb-print-paper-btns">
                <button
                  type="button"
                  className={`fc-pb-print-paper-btn${draft.paperSize === "Letter" ? " active" : ""}`}
                  onClick={() => setDraft((p) => patchConfig(p, { paperSize: "Letter" }))}
                >
                  <strong>Letter</strong>
                  <span>8.5×11in</span>
                </button>
                <button
                  type="button"
                  className={`fc-pb-print-paper-btn${draft.paperSize === "A4" ? " active" : ""}`}
                  onClick={() => setDraft((p) => patchConfig(p, { paperSize: "A4" }))}
                >
                  <strong>A4</strong>
                  <span>210×297mm</span>
                </button>
              </div>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Orientation</h3>
              <div className="fc-pb-print-paper-btns">
                <button
                  type="button"
                  className={`fc-pb-print-paper-btn${draft.orientation === "landscape" ? " active" : ""}`}
                  onClick={() =>
                    setDraft((p) => patchConfig(p, { orientation: "landscape" }))
                  }
                >
                  <strong>Landscape</strong>
                  <span>Horizontal</span>
                </button>
                <button
                  type="button"
                  className={`fc-pb-print-paper-btn${draft.orientation === "portrait" ? " active" : ""}`}
                  onClick={() =>
                    setDraft((p) => patchConfig(p, { orientation: "portrait" }))
                  }
                >
                  <strong>Portrait</strong>
                  <span>Vertical</span>
                </button>
              </div>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Page Padding</h3>
              <div className="fc-pb-print-field-row">
                <NumberField
                  label="Vertical"
                  value={draft.paddingVerticalCm}
                  unit="cm"
                  step={0.1}
                  onChange={(v) =>
                    setDraft((p) => patchConfig(p, { paddingVerticalCm: v }))
                  }
                />
                <NumberField
                  label="Horizontal"
                  value={draft.paddingHorizontalCm}
                  unit="cm"
                  step={0.1}
                  onChange={(v) =>
                    setDraft((p) => patchConfig(p, { paddingHorizontalCm: v }))
                  }
                />
              </div>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Scale PDF</h3>
              <NumberField
                label="Scale"
                value={draft.scalePdf}
                unit="%"
                min={50}
                max={200}
                onChange={(v) => setDraft((p) => patchConfig(p, { scalePdf: v }))}
              />
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Page Options</h3>
              <div className="fc-pb-print-select-row">
                <SelectField<PlaybookPrintFieldSource>
                  label="Page Title"
                  value={draft.format.pageTitle}
                  options={PLAYBOOK_PRINT_FIELD_OPTIONS.filter(
                    (opt) => opt.value !== "none",
                  )}
                  onChange={(v) =>
                    setDraft((p) => patchFormat(p, { pageTitle: v }))
                  }
                />
                <SelectField<PlaybookPrintFieldSource>
                  label="Subtitle"
                  value={draft.format.pageSubtitle}
                  options={PLAYBOOK_PRINT_FIELD_OPTIONS.filter(
                    (opt) => opt.value !== "none",
                  )}
                  onChange={(v) =>
                    setDraft((p) => patchFormat(p, { pageSubtitle: v }))
                  }
                />
                <SelectField<PlaybookPageNumberPosition>
                  label="Page #"
                  value={draft.format.pageNumberPosition}
                  options={PLAYBOOK_PAGE_NUMBER_OPTIONS}
                  onChange={(v) =>
                    setDraft((p) => patchFormat(p, { pageNumberPosition: v }))
                  }
                />
              </div>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Play Options</h3>
              <div className="fc-pb-print-select-row">
                <SelectField<PlaybookGridCount>
                  label="Frames Per Row"
                  value={draft.format.framesPerRow}
                  options={PLAYBOOK_GRID_COUNT_OPTIONS.map((n) => ({
                    value: n,
                    label: String(n),
                  }))}
                  onChange={(v) =>
                    setDraft((p) => patchFormat(p, { framesPerRow: v }))
                  }
                />
                <SelectField<PlaybookGridCount>
                  label="Rows Per Page"
                  value={draft.format.rowsPerPage}
                  options={PLAYBOOK_GRID_COUNT_OPTIONS.map((n) => ({
                    value: n,
                    label: String(n),
                  }))}
                  onChange={(v) =>
                    setDraft((p) => patchFormat(p, { rowsPerPage: v }))
                  }
                />
                <SelectField<PlaybookPrintFieldSource>
                  label="Title"
                  value={draft.format.playTitle}
                  options={PLAYBOOK_PRINT_FIELD_OPTIONS.filter(
                    (opt) => opt.value !== "none",
                  )}
                  onChange={(v) =>
                    setDraft((p) => patchFormat(p, { playTitle: v }))
                  }
                />
                <SelectField<PlaybookPrintFieldSource>
                  label="Subtitle"
                  value={draft.format.playSubtitle}
                  options={PLAYBOOK_PRINT_FIELD_OPTIONS.filter(
                    (opt) => opt.value !== "none",
                  )}
                  onChange={(v) =>
                    setDraft((p) => patchFormat(p, { playSubtitle: v }))
                  }
                />
              </div>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Layout Options</h3>
              <label className="fc-pb-print-check">
                <input
                  type="checkbox"
                  checked={draft.format.eachPlayNewLine}
                  onChange={(e) =>
                    setDraft((p) =>
                      patchFormat(p, { eachPlayNewLine: e.target.checked }),
                    )
                  }
                />
                Start each play on a new line
              </label>
              <label className="fc-pb-print-check">
                <input
                  type="checkbox"
                  checked={draft.eachPlaySeparatePage}
                  onChange={(e) =>
                    setDraft((p) =>
                      patchConfig(p, { eachPlaySeparatePage: e.target.checked }),
                    )
                  }
                />
                Start each play on a new page
              </label>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Display Options</h3>
              <label className="fc-pb-print-check">
                <input
                  type="checkbox"
                  checked={draft.includeToc}
                  onChange={(e) =>
                    setDraft((p) => patchConfig(p, { includeToc: e.target.checked }))
                  }
                />
                Table of contents
              </label>
              <label className="fc-pb-print-check">
                <input
                  type="checkbox"
                  checked={draft.includeNotes}
                  onChange={(e) =>
                    setDraft((p) => patchConfig(p, { includeNotes: e.target.checked }))
                  }
                />
                Frame notes
              </label>
              <label className="fc-pb-print-check">
                <input
                  type="checkbox"
                  checked={draft.showVideoPlaceholders}
                  onChange={(e) =>
                    setDraft((p) =>
                      patchConfig(p, { showVideoPlaceholders: e.target.checked }),
                    )
                  }
                />
                Show Video Clip Placeholders
              </label>
              <label className="fc-pb-print-check">
                <input
                  type="checkbox"
                  checked={draft.showAudioPlaceholders}
                  onChange={(e) =>
                    setDraft((p) =>
                      patchConfig(p, { showAudioPlaceholders: e.target.checked }),
                    )
                  }
                />
                Show Audio Clip Placeholders
              </label>
            </div>

            <div className="fc-pb-print-section">
              <label className="fc-pb-print-check fc-pb-print-check-inline">
                <input
                  type="checkbox"
                  checked={draft.overwriteClassicLayout}
                  onChange={(e) =>
                    setDraft((p) =>
                      patchConfig(p, { overwriteClassicLayout: e.target.checked }),
                    )
                  }
                />
                Overwrite layout of classic plays?
                <span className="fc-pb-print-help" title="Use FastDraw-style grid layout for all plays">
                  ?
                </span>
              </label>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Font Sizes</h3>
              <div className="fc-pb-print-font-grid">
                <NumberField
                  label="Playbook Title"
                  value={draft.fontSizes.playbookTitle}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchFonts(p, { playbookTitle: v }))
                  }
                />
                <NumberField
                  label="Chapter Title"
                  value={draft.fontSizes.chapterTitle}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchFonts(p, { chapterTitle: v }))
                  }
                />
                <NumberField
                  label="Element Title"
                  value={draft.fontSizes.elementTitle}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchFonts(p, { elementTitle: v }))
                  }
                />
                <NumberField
                  label="Element Text"
                  value={draft.fontSizes.elementText}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchFonts(p, { elementText: v }))
                  }
                />
                <NumberField
                  label="Play Descriptions"
                  value={draft.fontSizes.playDescriptions}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchFonts(p, { playDescriptions: v }))
                  }
                />
                <NumberField
                  label="Phase Descriptions"
                  value={draft.fontSizes.phaseDescriptions}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchFonts(p, { phaseDescriptions: v }))
                  }
                />
                <NumberField
                  label="Phase Title"
                  value={draft.fontSizes.phaseTitle}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchFonts(p, { phaseTitle: v }))
                  }
                />
              </div>
            </div>

            <div className="fc-pb-print-footer">
              <button
                type="button"
                className="fc-pb-print-restore-btn"
                onClick={handleRestore}
              >
                Restore Default Settings
              </button>
            </div>
          </div>
        ) : (
          <div className="fc-pb-print-tab-panel" role="tabpanel">
            <div className="fc-pb-print-cover-banner">
              <p>
                Design the cover page of your playbook. Uncheck if you don&apos;t
                want to include a cover page.
              </p>
              <label className="fc-pb-print-toggle-row">
                <span>Include Cover Page</span>
                <input
                  type="checkbox"
                  className="fc-pb-print-toggle"
                  checked={draft.cover.includeCover}
                  onChange={(e) =>
                    setDraft((p) =>
                      patchCover(p, { includeCover: e.target.checked }),
                    )
                  }
                />
              </label>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Vertical Alignment</h3>
              <div className="fc-pb-print-align-btns">
                {alignOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`fc-pb-print-align-btn${draft.cover.verticalAlign === opt.id ? " active" : ""}`}
                    onClick={() =>
                      setDraft((p) => patchCover(p, { verticalAlign: opt.id }))
                    }
                    title={opt.label}
                  >
                    <span className={`fc-pb-print-align-icon align-${opt.id}`} />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Team Name</h3>
              <div className="fc-pb-print-team-name-row">
                <label className="fc-pb-print-subtitle-input-wrap">
                  <span className="fc-pb-print-field-label">Team Name</span>
                  <input
                    type="text"
                    className="fc-pb-print-subtitle-input"
                    placeholder="Playbook / PDF branding if empty"
                    value={draft.cover.teamName}
                    onChange={(e) =>
                      setDraft((p) => patchCover(p, { teamName: e.target.value }))
                    }
                  />
                </label>
                <NumberField
                  label="Font Size"
                  value={draft.cover.teamNameFontSize}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchCover(p, { teamNameFontSize: v }))
                  }
                />
              </div>
            </div>

            <div className="fc-pb-print-section">
              <div className="fc-pb-print-section-head">
                <h3 className="fc-pb-print-section-title">Cover Image</h3>
                <label className="fc-pb-print-toggle-row compact">
                  <span>Add Cover Image</span>
                  <input
                    type="checkbox"
                    className="fc-pb-print-toggle"
                    checked={draft.cover.addCoverImage}
                    onChange={(e) =>
                      setDraft((p) =>
                        patchCover(p, { addCoverImage: e.target.checked }),
                      )
                    }
                  />
                </label>
              </div>
              {draft.cover.addCoverImage ? (
                <div className="fc-pb-print-cover-image-row">
                  <button
                    type="button"
                    className="fc-pb-print-cover-upload"
                    onClick={() => coverFileRef.current?.click()}
                  >
                    {draft.cover.coverImageDataUrl ? (
                      <img
                        src={draft.cover.coverImageDataUrl}
                        alt="Cover"
                        className="fc-pb-print-cover-thumb"
                      />
                    ) : (
                      <>
                        <span className="fc-pb-print-cover-camera" aria-hidden>
                          📷
                        </span>
                        <span>Update photo</span>
                      </>
                    )}
                  </button>
                  <NumberField
                    label="Image Width"
                    value={draft.cover.coverImageWidthPct}
                    unit="%"
                    min={10}
                    max={100}
                    onChange={(v) =>
                      setDraft((p) => patchCover(p, { coverImageWidthPct: v }))
                    }
                  />
                </div>
              ) : null}
              <p className="fc-pb-print-cover-hint">
                Allowed *.jpeg, *.jpg, *.png, *.gif
              </p>
              <input
                ref={coverFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => handleCoverImage(e.target.files?.[0])}
              />
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Subtitle</h3>
              <div className="fc-pb-print-subtitle-row">
                <label className="fc-pb-print-subtitle-input-wrap">
                  <span className="fc-pb-print-field-label">Subtitle</span>
                  <input
                    type="text"
                    className="fc-pb-print-subtitle-input"
                    placeholder="Subtitle"
                    value={draft.cover.subtitle}
                    onChange={(e) =>
                      setDraft((p) => patchCover(p, { subtitle: e.target.value }))
                    }
                  />
                </label>
                <NumberField
                  label="Font Size"
                  value={draft.cover.subtitleFontSize}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchCover(p, { subtitleFontSize: v }))
                  }
                />
                <NumberField
                  label="Margin Top"
                  value={draft.cover.subtitleMarginTop}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchCover(p, { subtitleMarginTop: v }))
                  }
                />
              </div>
            </div>

            <div className="fc-pb-print-section">
              <h3 className="fc-pb-print-section-title">Playbook Title</h3>
              <div className="fc-pb-print-field-row">
                <NumberField
                  label="Font Size"
                  value={draft.cover.titleFontSize}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchCover(p, { titleFontSize: v }))
                  }
                />
                <NumberField
                  label="Margin Top"
                  value={draft.cover.titleMarginTop}
                  unit="px"
                  onChange={(v) =>
                    setDraft((p) => patchCover(p, { titleMarginTop: v }))
                  }
                />
              </div>
            </div>

            <div className="fc-pb-print-footer fc-pb-print-footer-split">
              <button
                type="button"
                className="fc-pb-print-restore-btn outline"
                onClick={handleRestore}
              >
                Restore Default Settings
              </button>
              <button
                type="button"
                className="fc-pb-print-save-btn"
                onClick={handleSave}
              >
                <span aria-hidden>💾</span> Save Changes
              </button>
            </div>
          </div>
        )}

        {tab === "print" ? (
          <div className="fc-pb-print-footer sticky">
            <button
              type="button"
              className="fc-pb-print-save-btn"
              onClick={handleSave}
            >
              <span aria-hidden>💾</span> Save Changes
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
