"use client";

import { APP_LOGO_PATH } from "@/lib/config";
import { ClubLogoUpload } from "@/components/settings/ClubLogoUpload";
import { resolveAppLogoSrc } from "@/lib/settings/app-logo";
import {
  ACTION_COLOR_LABELS,
  APP_FONT_OPTIONS,
  DEFAULT_APPEARANCE,
  resetActionColors,
} from "@/lib/settings/appearance-settings";
import type { ActionColorKey, AppearanceSettings } from "@/types/appearance-settings";

const ACTION_COLOR_KEYS = Object.keys(
  ACTION_COLOR_LABELS,
) as ActionColorKey[];

function numOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function AppearanceSettingsSection({
  settings,
  onChange,
  appLogoDataUrl = null,
  onAppLogoChange,
}: {
  settings: AppearanceSettings;
  onChange: (next: AppearanceSettings) => void;
  appLogoDataUrl?: string | null;
  onAppLogoChange?: (dataUrl: string | null) => boolean | void;
}) {
  function patch<K extends keyof AppearanceSettings>(
    key: K,
    value: AppearanceSettings[K],
  ) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <section
      className="org-settings-group org-settings-appearance-section is-active-section"
      data-settings-section="appearance"
    >
      <div className="org-settings-appearance-split">
        <div className="org-settings-appearance-pane org-settings-line-colors-block">
          <div className="org-settings-appearance-pane-title">Editor colors</div>
          <p className="org-settings-brand-help" id="org-editor-colors-help">
            Panel accent, utility bar, and line colors apply to all coaches.
            Only the administrator can change them. Saved with Apply.
          </p>
          <label className="org-settings-brand-field org-settings-brand-color-field">
            <span>Panel accent</span>
            <input
              type="color"
              value={settings.panelAccent}
              onChange={(e) => patch("panelAccent", e.target.value)}
            />
          </label>
          <label className="org-settings-brand-field org-settings-brand-color-field">
            <span>Utility bar</span>
            <input
              type="color"
              value={settings.utilityBar}
              onChange={(e) => patch("utilityBar", e.target.value)}
            />
          </label>
          <div className="org-settings-sublabel org-settings-line-colors-label">
            Line colors
          </div>
          <div className="org-settings-action-colors">
            <div className="action-colors-list org-action-colors-list">
              {ACTION_COLOR_KEYS.map((key) => (
                <div key={key} className="action-color-row">
                  <span className="action-color-label">
                    {ACTION_COLOR_LABELS[key]}
                  </span>
                  <input
                    type="color"
                    className="action-color-input"
                    value={settings.actionColors[key]}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        actionColors: {
                          ...settings.actionColors,
                          [key]: e.target.value,
                        },
                      })
                    }
                    aria-label={ACTION_COLOR_LABELS[key]}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="action-colors-reset org-action-colors-reset"
              onClick={() => onChange(resetActionColors(settings))}
            >
              Reset colors
            </button>
          </div>
        </div>

        <div className="org-settings-appearance-pane org-settings-appearance-pane-theme">
          <div className="org-settings-appearance-pane-title">Theme &amp; layout</div>
          {onAppLogoChange ? (
            <ClubLogoUpload
              label="Application logo"
              previewAlt="Application logo"
              logoDataUrl={appLogoDataUrl}
              defaultPreviewSrc={APP_LOGO_PATH}
              removeLabel="Reset default"
              onChange={onAppLogoChange}
              hint="Master Admin only. Used for login, library header (left), and print fallback when no club logo is set. Saves immediately."
            />
          ) : (
            <div className="org-settings-brand-logo org-settings-app-logo-admin">
              <span>Application logo</span>
              <p className="org-settings-hint">
                FastCourt brand logo (left side of header).
              </p>
              <div className="playbook-logo-row">
                <div className="playbook-logo-preview app-logo-preview">
                  <img
                    src={resolveAppLogoSrc(appLogoDataUrl)}
                    alt="FastCourt"
                    className="app-logo-preview-img"
                  />
                </div>
              </div>
            </div>
          )}
          <label className="org-settings-brand-field org-settings-brand-color-field">
            <span>Header color</span>
            <input
              type="color"
              value={settings.headerColor}
              onChange={(e) => patch("headerColor", e.target.value)}
            />
          </label>
          <p className="org-settings-hint">
            Applies to library headers, tablet sidebar header, and the play
            editor top bar.
          </p>
          <label className="org-settings-brand-field" id="org-settings-app-font-wrap">
            <span>App font</span>
            <select
              id="org-app-font"
              value={settings.appFont}
              onChange={(e) => patch("appFont", e.target.value)}
              aria-label="App font"
            >
              {APP_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="org-theme-toggle" role="group" aria-label="Theme">
            <button
              type="button"
              className={`org-theme-btn${settings.theme === "light" ? " active" : ""}`}
              onClick={() => patch("theme", "light")}
            >
              ☀ Light
            </button>
            <button
              type="button"
              className={`org-theme-btn${settings.theme === "dark" ? " active" : ""}`}
              onClick={() => patch("theme", "dark")}
            >
              🌙 Dark
            </button>
          </div>
          <div className="org-settings-sublabel">Players on court</div>
          <div
            className="org-player-display-toggle"
            role="group"
            aria-label="Player display"
          >
            <button
              type="button"
              className={`org-player-display-btn${settings.playerDisplay === "number" ? " active" : ""}`}
              onClick={() => patch("playerDisplay", "number")}
            >
              Number only
            </button>
            <button
              type="button"
              className={`org-player-display-btn${settings.playerDisplay === "circle" ? " active" : ""}`}
              onClick={() => patch("playerDisplay", "circle")}
            >
              Number in circle
            </button>
          </div>
          <div className="org-settings-sublabel">Play editor sidebar</div>
          <div className="org-settings-col-width-grid org-settings-col-width-grid-single">
            <label className="org-settings-col-width-field">
              <span>Font size (px)</span>
              <div className="org-settings-range-row">
                <input
                  type="range"
                  min={9}
                  max={20}
                  value={settings.designerColumns.tableFont}
                  aria-label="Play editor sidebar font size"
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      designerColumns: {
                        ...settings.designerColumns,
                        tableFont: Number(e.target.value) || 14,
                      },
                    })
                  }
                />
                <span className="org-settings-range-value">
                  {settings.designerColumns.tableFont}px
                </span>
              </div>
            </label>
          </div>
          <p className="org-settings-hint">
            Controls font size in the designer left panel and the court toolbar
            (FastPlace, Next Frame, Animate, etc.). Applies to all coaches after
            Apply.
          </p>
          <div className="org-settings-sublabel">Drawing input</div>
          <label className="org-settings-check">
            <input
              type="checkbox"
              checked={settings.allowFingerDraw}
              onChange={(e) => patch("allowFingerDraw", e.target.checked)}
            />
            <span>Allow finger drawing on court</span>
          </label>
          <label className="org-settings-check">
            <input
              type="checkbox"
              checked={settings.highContrastCourt}
              onChange={(e) => patch("highContrastCourt", e.target.checked)}
            />
            <span>High-contrast court (projector)</span>
          </label>
        </div>

        <div className="org-settings-appearance-pane org-settings-appearance-pane-library org-settings-library-columns">
          <div className="org-settings-appearance-pane-title">Library table</div>
          <p className="org-settings-brand-help org-settings-appearance-pane-help">
            Set column widths in pixels for all coaches. Leave blank for auto
            width based on content. Saved with Apply.
          </p>
          <div className="org-settings-col-width-grid">
            <label className="org-settings-col-width-field">
              <span>Table font (px)</span>
              <input
                type="number"
                min={12}
                max={28}
                value={settings.libraryColumns.tableFont}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryColumns: {
                      ...settings.libraryColumns,
                      tableFont: Number(e.target.value) || 12,
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Season (px)</span>
              <input
                type="number"
                placeholder="Auto"
                value={settings.libraryColumns.season ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryColumns: {
                      ...settings.libraryColumns,
                      season: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>List / preview split (%)</span>
              <input
                type="number"
                min={28}
                max={72}
                value={settings.libraryColumns.listSplitPct}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryColumns: {
                      ...settings.libraryColumns,
                      listSplitPct: Number(e.target.value) || 44,
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Team (px)</span>
              <input
                type="number"
                placeholder="Auto"
                value={settings.libraryColumns.team ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryColumns: {
                      ...settings.libraryColumns,
                      team: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Series (px)</span>
              <input
                type="number"
                placeholder="Auto"
                value={settings.libraryColumns.series ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryColumns: {
                      ...settings.libraryColumns,
                      series: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Tags (px)</span>
              <input
                type="number"
                placeholder="Auto"
                value={settings.libraryColumns.tags ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryColumns: {
                      ...settings.libraryColumns,
                      tags: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="org-settings-btn org-settings-btn-inline org-settings-appearance-reset-btn"
            onClick={() =>
              onChange({
                ...settings,
                libraryColumns: { ...DEFAULT_APPEARANCE.libraryColumns },
              })
            }
          >
            Reset column widths
          </button>
          <div className="org-settings-sublabel org-settings-library-frames-grid-label">
            Preview frames grid
          </div>
          <div className="org-settings-col-width-grid org-settings-col-width-grid-compact">
            <label className="org-settings-col-width-field">
              <span>Columns</span>
              <input
                type="number"
                min={1}
                max={6}
                value={settings.libraryFramesGrid.columns}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryFramesGrid: {
                      ...settings.libraryFramesGrid,
                      columns: Number(e.target.value) || 3,
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Gap (px)</span>
              <input
                type="number"
                min={4}
                max={32}
                value={settings.libraryFramesGrid.gap}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    libraryFramesGrid: {
                      ...settings.libraryFramesGrid,
                      gap: Number(e.target.value) || 12,
                    },
                  })
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="org-settings-btn org-settings-btn-inline org-settings-appearance-reset-btn"
            onClick={() =>
              onChange({
                ...settings,
                libraryFramesGrid: { ...DEFAULT_APPEARANCE.libraryFramesGrid },
              })
            }
          >
            Reset frames grid
          </button>
        </div>

        <div className="org-settings-appearance-pane org-settings-appearance-pane-designer org-settings-designer-columns">
          <div className="org-settings-appearance-pane-title">Play editor layout</div>
          <p className="org-settings-brand-help org-settings-appearance-pane-help">
            Admin only. Controls the first tools column (Positions, Actions, etc.) for
            all coaches. Click Apply to save.
          </p>
          <div className="org-settings-col-width-grid org-settings-col-width-grid-single">
            <label className="org-settings-col-width-field">
              <span>Tools column width (px)</span>
              <input
                type="number"
                min={200}
                max={480}
                placeholder="380"
                value={settings.designerColumns.tools ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    designerColumns: {
                      ...settings.designerColumns,
                      tools: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Tools column font (px)</span>
              <input
                type="number"
                min={11}
                max={22}
                value={settings.designerColumns.tableFont}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    designerColumns: {
                      ...settings.designerColumns,
                      tableFont: Number(e.target.value) || 15,
                    },
                  })
                }
              />
            </label>
          </div>
          <p className="org-settings-brand-help org-settings-appearance-pane-help">
            Other editor columns (court, notes, frames). Leave Court blank so it fills
            remaining space.
          </p>
          <div className="org-settings-col-width-grid">
            <label className="org-settings-col-width-field">
              <span>Court (px)</span>
              <input
                type="number"
                placeholder="Auto"
                value={settings.designerColumns.court ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    designerColumns: {
                      ...settings.designerColumns,
                      court: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Notes (px)</span>
              <input
                type="number"
                placeholder="300"
                value={settings.designerColumns.notes ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    designerColumns: {
                      ...settings.designerColumns,
                      notes: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="org-settings-col-width-field">
              <span>Frames (px)</span>
              <input
                type="number"
                placeholder="207"
                value={settings.designerColumns.frames ?? ""}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    designerColumns: {
                      ...settings.designerColumns,
                      frames: numOrNull(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="org-settings-btn org-settings-btn-inline org-settings-appearance-reset-btn"
            onClick={() =>
              onChange({
                ...settings,
                designerColumns: { ...DEFAULT_APPEARANCE.designerColumns },
              })
            }
          >
            Reset editor layout
          </button>
        </div>
      </div>
    </section>
  );
}
