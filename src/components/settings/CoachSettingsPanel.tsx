"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatExpiryLabel } from "@/lib/auth/admin-users";
import { coachMayCustomizeBranding, orgHasConfiguredBranding } from "@/lib/settings/org-branding";
import { DEFAULT_PDF_BRAND } from "@/lib/settings/pdf-branding";
import {
  loadScopedUserSettings,
  saveScopedUserSettings,
} from "@/lib/settings/user-settings-storage";
import { findOrganizationMembership } from "@/lib/auth/org-access";
import { hasFullAccess } from "@/lib/auth/roles";
import { SubscriptionSection } from "@/components/billing/SubscriptionSection";
import { AccountSystemSection } from "@/components/settings/AccountSystemSection";
import { CloudSyncSection } from "@/components/settings/CloudSyncSection";
import { DeviceAccessSection } from "@/components/settings/DeviceAccessSection";
import { NotificationSettingsSection } from "@/components/settings/NotificationSettingsSection";
import { PdfBrandingSection } from "@/components/settings/PdfBrandingSection";
import { ToolsSection } from "@/components/settings/ToolsSection";
import {
  confirmDiscardSettings,
  UserSettingsShell,
  type UserSettingsNavGroup,
} from "@/components/settings/UserSettingsShell";
import { useSettingsStore } from "@/stores/settings-store";
import type { AuthSession } from "@/types/auth";
import type { PdfBrandSettings } from "@/types/pdf-branding";
import "@/styles/admin-settings.css";
import "@/styles/billing-ui.css";

type CoachNavId =
  | "account"
  | "subscription"
  | "branding"
  | "tools"
  | "cloud"
  | "devices"
  | "notifications";

const NAV_GROUPS: UserSettingsNavGroup[] = [
  {
    label: "Account",
    items: [
      { id: "account", label: "Profile & account" },
      { id: "subscription", label: "Subscription" },
      { id: "devices", label: "Devices & login" },
    ],
  },
  {
    label: "Workspace",
    items: [{ id: "branding", label: "PDF & branding" }],
  },
  {
    label: "Data",
    items: [
      { id: "tools", label: "Import & export" },
      { id: "cloud", label: "Cloud sync" },
      { id: "notifications", label: "Notifications" },
    ],
  },
];

export function CoachSettingsPanel({ session }: { session: AuthSession }) {
  const router = useRouter();
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const notifications = useSettingsStore((s) => s.notifications);
  const useOrgBranding = useSettingsStore((s) => s.useOrgBranding);
  const setPdfBrand = useSettingsStore((s) => s.setPdfBrand);
  const setNotifications = useSettingsStore((s) => s.setNotifications);
  const setUseOrgBranding = useSettingsStore((s) => s.setUseOrgBranding);
  const persistAll = useSettingsStore((s) => s.persistAll);
  const hydrateForUser = useSettingsStore((s) => s.hydrateForUser);

  const [navId, setNavId] = useState<CoachNavId>("account");
  const [draftBrand, setDraftBrand] = useState<PdfBrandSettings>(pdfBrand);
  const [draftNotifications, setDraftNotifications] = useState(notifications);
  const [draftUseOrgBranding, setDraftUseOrgBranding] = useState(useOrgBranding);
  const [dirty, setDirty] = useState(false);

  const membership = useMemo(
    () => findOrganizationMembership(session.user.email),
    [session.user.email],
  );
  const org = membership?.org ?? null;
  const hasOrgMembership = org != null;
  const orgHasBranding = orgHasConfiguredBranding(org);
  const canCustomizeBranding = coachMayCustomizeBranding(org);
  const effectiveUseOrgBranding = hasOrgMembership && orgHasBranding && draftUseOrgBranding;

  const accessLabel = useMemo(() => {
    if (session.user.organizationName && session.user.accessSource === "organization") {
      return `Access via ${session.user.organizationName}`;
    }
    if (hasFullAccess(session.user)) return "Unlimited access";
    if (!session.user.expiresAt) return "Trial active";
    return `Access until ${formatExpiryLabel(session.user.expiresAt)}`;
  }, [session.user]);

  const subtitle = `Signed in as ${session.user.displayName}${
    session.user.organizationName ? ` · ${session.user.organizationName}` : ""
  } — ${accessLabel}`;

  function markDirty() {
    setDirty(true);
  }

  async function handleApply() {
    const nextUseOrgBranding =
      hasOrgMembership && orgHasBranding ? draftUseOrgBranding : false;
    const existing = loadScopedUserSettings(session.user.id);
    const personalPdf = effectiveUseOrgBranding
      ? { ...DEFAULT_PDF_BRAND, ...(existing.pdfBrand ?? draftBrand) }
      : draftBrand;

    saveScopedUserSettings(session.user.id, {
      ...existing,
      pdfBrand: personalPdf,
      notifications: draftNotifications,
      useOrgBranding: nextUseOrgBranding,
    });

    setNotifications(draftNotifications, false);
    setUseOrgBranding(nextUseOrgBranding, false);
    if (!nextUseOrgBranding) {
      setPdfBrand(draftBrand, false);
    }

    await persistAll(session.user);
    await hydrateForUser(session.user);
    setDirty(false);
  }

  async function handleClose() {
    if (!(await confirmDiscardSettings(dirty))) return;
    router.push("/library");
  }

  return (
    <UserSettingsShell
      className="fc-coach-settings"
      subtitle={subtitle}
      navGroups={NAV_GROUPS}
      navId={navId}
      onNavChange={(id) => setNavId(id as CoachNavId)}
      dirty={dirty}
      onApply={() => void handleApply()}
      onClose={handleClose}
    >
      {navId === "account" ? (
        <AccountSystemSection session={session} showPasswordForm />
      ) : null}

      {navId === "subscription" ? <SubscriptionSection user={session.user} /> : null}

      {navId === "devices" ? <DeviceAccessSection session={session} /> : null}

      {navId === "branding" ? (
        <>
          {hasOrgMembership && orgHasBranding ? (
            <div className="org-settings-access-card">
              <div className="org-settings-sublabel">Organization branding</div>
              <label className="org-settings-toggle-row">
                <input
                  type="checkbox"
                  checked={draftUseOrgBranding}
                  disabled={!canCustomizeBranding}
                  onChange={(e) => {
                    setDraftUseOrgBranding(e.target.checked);
                    markDirty();
                  }}
                />
                <span>
                  {canCustomizeBranding
                    ? `Use ${org!.name} branding on PDF exports`
                    : `Branding is managed by ${org!.name}`}
                </span>
              </label>
            </div>
          ) : null}
          {!hasOrgMembership || !effectiveUseOrgBranding ? (
            <PdfBrandingSection
              brand={draftBrand}
              onChange={(next) => {
                setDraftBrand(next);
                markDirty();
              }}
              onLogoChange={(next) => {
                setDraftBrand(next);
                const saved = setPdfBrand(next, true);
                if (!saved) return false;
                return true;
              }}
            />
          ) : canCustomizeBranding ? (
            <p className="org-settings-hint">
              Organization branding is enabled. Turn off the toggle above to set
              personal PDF branding.
            </p>
          ) : (
            <p className="org-settings-hint">
              Your team administrator controls PDF branding for {org?.name ?? "your club"}.
            </p>
          )}
        </>
      ) : null}

      {navId === "tools" ? <ToolsSection /> : null}

      {navId === "cloud" ? <CloudSyncSection session={session} /> : null}

      {navId === "notifications" ? (
        <NotificationSettingsSection
          prefs={draftNotifications}
          onChange={(next) => {
            setDraftNotifications(next);
            markDirty();
          }}
        />
      ) : null}
    </UserSettingsShell>
  );
}
