"use client";

import { useMemo } from "react";
import {
  COURT_COLOR_PRESETS,
  courtAppearanceFromPreset,
} from "@/lib/settings/court-appearance";
import { courtWoodSwatchCssStyle } from "@/lib/designer/court-wood-pattern-css";
import {
  COURT_FEATURE_OPTIONS,
  COURT_TEMPLATE_OPTIONS,
  mergeCourtViewSettings,
  resolvePlayCourtAppearance,
} from "@/lib/designer/court-view-settings";
import { useSettingsStore } from "@/stores/settings-store";
import type { CourtType, CourtViewSettings } from "@/types/designer";

function isPresetActive(
  floorColor: string,
  lineColor: string,
  presetFloor: string,
  presetLine: string,
) {
  return floorColor === presetFloor && lineColor === presetLine;
}

export interface CourtSettingsPanelProps {
  courtType: CourtType;
  courtView: CourtViewSettings | null | undefined;
  onCourtTypeChange: (courtType: CourtType) => void;
  onCourtViewChange: (patch: Partial<CourtViewSettings>) => void;
}

export function CourtSettingsPanel({
  courtType,
  courtView: courtViewRaw,
  onCourtTypeChange,
  onCourtViewChange,
}: CourtSettingsPanelProps) {
  const appearance = useSettingsStore((s) => s.appearance);

  const courtView = useMemo(
    () => mergeCourtViewSettings(courtViewRaw),
    [courtViewRaw],
  );
  const courtAppearance = useMemo(
    () => resolvePlayCourtAppearance(courtViewRaw, appearance),
    [courtViewRaw, appearance],
  );

  const customColorsActive = !COURT_COLOR_PRESETS.some((preset) =>
    isPresetActive(
      courtAppearance.floorColor,
      courtAppearance.lineColor,
      preset.floorColor,
      preset.lineColor,
    ),
  );

  function patchFloorColor(floorColor: string) {
    onCourtViewChange({
      floorColor,
      showWoodTiles: false,
      woodTextureId: undefined,
    });
  }

  function patchLineColor(lineColor: string) {
    onCourtViewChange({ lineColor });
  }

  function isPresetSelected(preset: typeof COURT_COLOR_PRESETS[number]) {
    if (
      courtAppearance.floorColor !== preset.floorColor ||
      courtAppearance.lineColor !== preset.lineColor
    ) {
      return false;
    }
    if (preset.showWoodTiles) {
      return (
        courtAppearance.showWoodTiles &&
        (courtAppearance.woodTextureId ?? null) ===
          (preset.woodTextureId ?? null)
      );
    }
    return !courtAppearance.showWoodTiles;
  }

  function applyPreset(preset: typeof COURT_COLOR_PRESETS[number]) {
    onCourtViewChange(courtAppearanceFromPreset(preset));
  }

  return (
    <div className="fc-court-settings-fields">
      <div className="ds-fd-court-settings-row">
        <label className="ds-fd-court-settings-field">
          <span className="ds-fd-court-settings-label">Court Template</span>
          <select
            className="ds-fd-court-settings-select"
            value={courtView.template}
            onChange={(e) => {
              const template = e.target.value as typeof courtView.template;
              const option = COURT_TEMPLATE_OPTIONS.find((o) => o.value === template);
              if (!option?.enabled) return;
              onCourtViewChange({ template });
            }}
          >
            {COURT_TEMPLATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={!opt.enabled}>
                {opt.label}
                {!opt.enabled ? " (soon)" : ""}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="ds-fd-court-settings-fieldset">
          <legend className="ds-fd-court-settings-label">Court Size</legend>
          <div className="ds-fd-court-settings-radio-row">
            {(["half", "full"] as CourtType[]).map((size) => (
              <label key={size} className="ds-fd-court-settings-radio">
                <input
                  type="radio"
                  name="court-size"
                  checked={courtType === size}
                  onChange={() => onCourtTypeChange(size)}
                />
                <span>{size === "half" ? "Half Court" : "Full Court"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="ds-fd-court-settings-sep" />

      <div className="ds-fd-court-settings-field">
        <span className="ds-fd-court-settings-label">Court Color</span>
        <div className="ds-fd-court-settings-color-row">
          <div className="ds-fd-court-settings-swatches">
            {COURT_COLOR_PRESETS.map((preset) => {
              const active = isPresetSelected(preset);
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`ds-fd-court-settings-swatch${active ? " is-active" : ""}`}
                  title={preset.label}
                  style={courtWoodSwatchCssStyle(preset)}
                  onClick={() => applyPreset(preset)}
                >
                  <span
                    className="ds-fd-court-settings-swatch-line"
                    style={{ backgroundColor: preset.lineColor }}
                  />
                </button>
              );
            })}
            <button
              type="button"
              className={`ds-fd-court-settings-swatch ds-fd-court-settings-swatch-add${customColorsActive ? " is-active" : ""}`}
              title="Custom colors"
              onClick={() => patchFloorColor(courtAppearance.floorColor)}
            >
              +
            </button>
          </div>
          <div className="ds-fd-court-settings-color-pickers">
            <label className="ds-fd-court-settings-color-picker">
              <span>Court</span>
              <input
                type="color"
                value={courtAppearance.floorColor}
                onChange={(e) => patchFloorColor(e.target.value)}
              />
            </label>
            <label className="ds-fd-court-settings-color-picker">
              <span>Lines</span>
              <input
                type="color"
                value={courtAppearance.lineColor}
                onChange={(e) => patchLineColor(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="ds-fd-court-settings-sep" />

      <label className="ds-fd-court-settings-field ds-fd-court-settings-field--inline">
        <span className="ds-fd-court-settings-label">Space out of bounds</span>
        <div className="ds-fd-court-settings-range-wrap">
          <input
            type="range"
            className="ds-fd-court-settings-range"
            min={0}
            max={4}
            step={4}
            value={courtView.sidelinesFt}
            onChange={(e) =>
              onCourtViewChange({ sidelinesFt: Number(e.target.value) || 0 })
            }
          />
          <span className="ds-fd-court-settings-range-value">
            {courtView.sidelinesFt}
          </span>
        </div>
      </label>

      <div className="ds-fd-court-settings-sep" />

      <fieldset className="ds-fd-court-settings-fieldset">
        <legend className="ds-fd-court-settings-label">Court Features</legend>
        <div className="ds-fd-court-settings-checks">
          {COURT_FEATURE_OPTIONS.map((feature) => {
            const checked =
              feature.baskets
                ? courtView.showBaskets
                : courtView.featureFilters[feature.key] !== false;
            return (
              <label key={feature.key} className="ds-fd-court-settings-check">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (feature.baskets) {
                      onCourtViewChange({ showBaskets: e.target.checked });
                    } else {
                      onCourtViewChange({
                        featureFilters: {
                          [feature.key]: e.target.checked,
                        },
                      });
                    }
                  }}
                />
                <span>{feature.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
