"use client";

import type { CSSProperties } from "react";
import { resolveAppLogoSrc } from "@/lib/settings/app-logo";
import { resolveHeaderNavActiveTextColor } from "@/lib/settings/color-contrast";
import type { AppearanceSettings } from "@/types/appearance-settings";

const PREVIEW_TABS = ["LIBRARY", "PLAYBOOKS", "FIELDS"] as const;

export function HeaderAppearancePreview({
  settings,
  teamTitle = "Your team",
  appLogoDataUrl = null,
  clubLogoDataUrl = null,
}: {
  settings: Pick<
    AppearanceSettings,
    | "headerColor"
    | "headerBrandRowColor"
    | "headerNavActiveColor"
    | "headerNavTabFontSize"
  >;
  teamTitle?: string;
  appLogoDataUrl?: string | null;
  clubLogoDataUrl?: string | null;
}) {
  const appLogo = resolveAppLogoSrc(appLogoDataUrl);
  const clubLogo = clubLogoDataUrl?.trim() ?? "";
  const style = {
    "--fc-preview-header": settings.headerColor,
    "--fc-preview-brand-row": settings.headerBrandRowColor,
    "--fc-preview-nav-active": settings.headerNavActiveColor,
    "--fc-preview-nav-active-text": resolveHeaderNavActiveTextColor(
      settings.headerNavActiveColor,
    ),
    "--fc-preview-nav-tab-font-size": `${settings.headerNavTabFontSize}px`,
  } as CSSProperties;

  return (
    <div className="fc-header-appearance-preview" style={style}>
      <div className="fc-header-appearance-preview-label">Live preview</div>
      <div className="fc-header-appearance-preview-frame" aria-hidden="true">
        <div className="fc-hp-util">
          <span className="fc-hp-util-label">PLAYS</span>
        </div>
        <div className="fc-hp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={appLogo} alt="" className="fc-hp-app-logo" />
          <span className="fc-hp-team">{teamTitle || "FastCourt"}</span>
          {clubLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clubLogo} alt="" className="fc-hp-club-logo" />
          ) : (
            <span className="fc-hp-club-placeholder" />
          )}
        </div>
        <div className="fc-hp-tabs">
          {PREVIEW_TABS.map((tab) => (
            <span
              key={tab}
              className={`fc-hp-tab${tab === "LIBRARY" ? " is-active" : ""}`}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
      <p className="org-settings-hint fc-header-appearance-preview-hint">
        Preview updates as you change colors. Saved with Apply.
      </p>
    </div>
  );
}
