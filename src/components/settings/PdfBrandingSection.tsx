"use client";

import { ClubLogoUpload } from "@/components/settings/ClubLogoUpload";
import type { PdfBrandSettings } from "@/types/pdf-branding";

export function PdfBrandingSection({
  brand,
  onChange,
  onLogoChange,
}: {
  brand: PdfBrandSettings;
  onChange: (next: PdfBrandSettings) => void;
  onLogoChange?: (next: PdfBrandSettings) => boolean | void;
}) {
  function patch<K extends keyof PdfBrandSettings>(key: K, value: PdfBrandSettings[K]) {
    onChange({ ...brand, [key]: value });
  }

  function handleLogoChange(dataUrl: string | null): boolean {
    const next = { ...brand, logoDataUrl: dataUrl };
    onChange(next);
    if (onLogoChange) return onLogoChange(next) !== false;
    return true;
  }

  return (
    <section className="org-settings-group is-active-section" data-settings-section="pdf-branding">
      <div className="org-settings-group-title">PDF branding</div>
      <p className="org-settings-brand-help">
        Club name, tagline, footer line, and logo appear on Playbook PDF, Session
        PDF, and single play exports. Text fields save with Apply; logo saves
        immediately.
      </p>
      <label className="org-settings-brand-field">
        <span>Club / team name</span>
        <input
          type="text"
          value={brand.clubName}
          onChange={(e) => patch("clubName", e.target.value)}
          placeholder="e.g. Athens BC U18"
        />
      </label>
      <label className="org-settings-brand-field">
        <span>Tagline (optional)</span>
        <input
          type="text"
          value={brand.subtitle}
          onChange={(e) => patch("subtitle", e.target.value)}
          placeholder="e.g. 2025–26 Season"
        />
      </label>
      <label className="org-settings-brand-field">
        <span>Footer line (optional)</span>
        <input
          type="text"
          value={brand.footerText}
          onChange={(e) => patch("footerText", e.target.value)}
          placeholder="e.g. Athens BC — Confidential"
        />
      </label>
      <label className="org-settings-brand-field org-settings-brand-color-field">
        <span>Header color (PDF + app headers)</span>
        <input
          type="color"
          value={brand.headerColor}
          onChange={(e) => patch("headerColor", e.target.value)}
        />
      </label>
      <ClubLogoUpload
        logoDataUrl={brand.logoDataUrl}
        onChange={handleLogoChange}
        hint="Shown in the app header (right) and on PDF exports. Saves immediately."
      />
    </section>
  );
}
