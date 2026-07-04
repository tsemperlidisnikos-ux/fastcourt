"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { APP_BUILD } from "@/lib/config";
import { useAppLogoSrc } from "@/hooks/useAppLogoSrc";
import { useLibraryNavModules } from "@/hooks/useLibraryNavModules";
import {
  isLibraryNavModuleEnabled,
} from "@/lib/settings/library-nav-modules";
import {
  LIBRARY_NAV_TABS,
  type LibraryNavTabId,
} from "@/lib/library/library-nav-tabs";
import { PracticeSheetOverlay } from "@/components/library/PracticeSheetOverlay";
import { UserMenu } from "@/components/shell/UserMenu";
import { useLibraryStore } from "@/stores/library-store";
import { useSettingsStore } from "@/stores/settings-store";

export type { LibraryNavTabId };

function isNavTabActive(
  tab: (typeof LIBRARY_NAV_TABS)[number],
  pathname: string,
  activeTab: LibraryNavTabId,
) {
  if (tab.id === "film-room") return pathname.startsWith("/film-room");
  return pathname.startsWith("/library") && activeTab === tab.id;
}

export function FdAppHeader({ activeTab = "draw" }: { activeTab?: LibraryNavTabId }) {
  const pathname = usePathname();
  const [practiceSheetOpen, setPracticeSheetOpen] = useState(false);
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const appLogoSrc = useAppLogoSrc();
  const navModules = useLibraryNavModules();

  const visibleTabs = useMemo(
    () =>
      LIBRARY_NAV_TABS.filter((tab) => {
        if (tab.id === "coach") {
          return (
            isLibraryNavModuleEnabled(navModules, "practice") ||
            isLibraryNavModuleEnabled(navModules, "film-room")
          );
        }
        if (tab.id === "film-room") {
          return isLibraryNavModuleEnabled(navModules, "film-room");
        }
        return isLibraryNavModuleEnabled(navModules, tab.id);
      }),
    [navModules],
  );

  const clubName = pdfBrand.clubName.trim();
  const clubLogo = pdfBrand.logoDataUrl?.trim() ?? "";
  const hasClubLogo = clubLogo.length > 0;
  const teamTitle = clubName || "FastCourt";

  return (
    <div className="fd-app-header" id="screen-organizer-header">
      <header className="fd-topbar-util" aria-label="Application bar">
        <div className="fd-topbar-util-inner">
          <div className="fd-topbar-util-left org-topnav-left" aria-hidden="true" />
          <div className="fd-topbar-util-center" aria-hidden="true" />
          <div className="fd-topbar-util-right org-topnav-right">
            <UserMenu variant="topbar" />
          </div>
        </div>
      </header>

      <header
        className={`fd-hero-header org-topnav fd-topnav${hasClubLogo ? " has-custom-team-logo" : ""}`}
      >
        <div className="fd-hero-inner fd-topnav-inner">
          <div className="fd-hero-top-row">
            <div className="fd-hero-brand-shell fd-hero-app-logo-wrap">
              <div className="fd-hero-brand-center">
                <button
                  type="button"
                  className="fd-hero-brand-logo-btn"
                  onClick={() => setPracticeSheetOpen(true)}
                  aria-label="Open practice sheet"
                  title="Open practice sheet"
                >
                  <Image
                    src={appLogoSrc}
                    alt="FastCourt"
                    className="fd-hero-brand-logo"
                    id="org-header-brand-logo"
                    width={120}
                    height={120}
                    unoptimized
                  />
                </button>
              </div>
            </div>
            <h1 className="fd-team-title" id="org-header-team-title">
              {teamTitle}
            </h1>
            <div
              className="fd-hero-club-logo-wrap"
              hidden={!hasClubLogo}
            >
              {hasClubLogo ? (
                <img
                  src={clubLogo}
                  alt={clubName || "Club logo"}
                  className="fd-hero-brand-logo fd-hero-brand-logo-flank fd-hero-club-logo"
                  id="org-header-brand-logo-right"
                />
              ) : null}
            </div>
          </div>
          <div className="fd-main-tabs-row">
            <nav className="fd-main-tabs org-main-tabs" aria-label="Library sections">
              {visibleTabs.map((tab) => {
                const active = isNavTabActive(tab, pathname, activeTab);
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`fd-main-tab org-main-tab${active ? " active" : ""}`}
                    data-fd-tab={tab.id}
                    title={"shortLabel" in tab ? tab.label : undefined}
                  >
                    {"shortLabel" in tab ? (
                      <>
                        <span className="fd-main-tab-label-full">{tab.label}</span>
                        <span className="fd-main-tab-label-short">{tab.shortLabel}</span>
                      </>
                    ) : (
                      tab.label
                    )}
                  </Link>
                );
              })}
            </nav>
            <div
              className="fd-main-tabs-actions"
              id="fd-main-tabs-actions"
              aria-label="Tab actions"
            />
          </div>
        </div>
      </header>
      {practiceSheetOpen ? (
        <PracticeSheetOverlay key="practice-sheet" onClose={() => setPracticeSheetOpen(false)} />
      ) : null}
    </div>
  );
}

export function FdAppFooter() {
  const items = useLibraryStore((s) => s.items);
  const latestSave = items.reduce<string | null>((latest, item) => {
    if (!latest) return item.updatedAt;
    return new Date(item.updatedAt).getTime() > new Date(latest).getTime()
      ? item.updatedAt
      : latest;
  }, null);

  const savedLabel = latestSave
    ? `Saved ${new Date(latestSave).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`
    : "Saved";

  return (
    <footer className="fd-app-footer org-statusbar">
      <div className="fd-app-footer-inner">
        <p className="fd-app-footer-line">
          Copyright © 2026 FastCourt. All Rights Reserved.
        </p>
        <p className="fd-app-footer-line fd-app-footer-version">
          Build {APP_BUILD} · <span className="library-save-status">{savedLabel}</span>
        </p>
      </div>
    </footer>
  );
}
