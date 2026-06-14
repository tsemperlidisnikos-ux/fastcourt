"use client";

import { ClubLogoUpload } from "@/components/settings/ClubLogoUpload";
import type { OrgBrandingSettings } from "@/types/org-branding";

export function OrgBrandingSection({
  branding,
  orgName,
  onChange,
  allowCoachToggle = true,
}: {
  branding: OrgBrandingSettings;
  orgName: string;
  onChange: (next: OrgBrandingSettings) => void;
  allowCoachToggle?: boolean;
}) {
  function patch<K extends keyof OrgBrandingSettings>(key: K, value: OrgBrandingSettings[K]) {
    onChange({ ...branding, [key]: value });
  }

  return (
    <section
      className="org-settings-group is-active-section"
      data-settings-section="org-branding"
    >
      <div className="org-settings-group-title">Team branding</div>
      <p className="org-settings-brand-help">
        Default PDF and header branding for coaches in {orgName || "your organization"}.
      </p>

      <label className="org-settings-brand-field">
        <span>Club / team name</span>
        <input
          type="text"
          value={branding.clubName ?? orgName}
          onChange={(e) => patch("clubName", e.target.value)}
        />
      </label>
      <label className="org-settings-brand-field">
        <span>Tagline (optional)</span>
        <input
          type="text"
          value={branding.subtitle ?? ""}
          onChange={(e) => patch("subtitle", e.target.value)}
        />
      </label>
      <label className="org-settings-brand-field">
        <span>Footer line (optional)</span>
        <input
          type="text"
          value={branding.footerText ?? ""}
          onChange={(e) => patch("footerText", e.target.value)}
        />
      </label>
      <label className="org-settings-brand-field org-settings-brand-color-field">
        <span>Header color</span>
        <input
          type="color"
          value={branding.headerColor ?? "#000000"}
          onChange={(e) => patch("headerColor", e.target.value)}
        />
      </label>

      <ClubLogoUpload
        logoDataUrl={branding.logoDataUrl ?? null}
        onChange={(dataUrl) => patch("logoDataUrl", dataUrl)}
        hint="Organization logo for PDF exports and optional coach headers."
      />

      {allowCoachToggle ? (
        <label className="org-settings-toggle-row">
          <input
            type="checkbox"
            checked={branding.allowCoachBranding !== false}
            onChange={(e) => patch("allowCoachBranding", e.target.checked)}
          />
          <span>Allow coaches to customize their own branding</span>
        </label>
      ) : null}
    </section>
  );
}
