"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatExpiryLabel } from "@/lib/auth/admin-users";
import {
  findOrganizationMembership,
  isOrganizationSubscriptionActive,
} from "@/lib/auth/org-access";
import { formatOrgExpiry } from "@/lib/auth/team-organizations";
import {
  loadTeamOrganizations,
  saveTeamOrganizations,
} from "@/lib/auth/team-organizations";
import { SubscriptionSection } from "@/components/billing/SubscriptionSection";
import { AccountSystemSection } from "@/components/settings/AccountSystemSection";
import { CloudSyncSection } from "@/components/settings/CloudSyncSection";
import { OrgBrandingSection } from "@/components/settings/OrgBrandingSection";
import { TeamOrganizationsSection } from "@/components/settings/TeamOrganizationsSection";
import {
  confirmDiscardSettings,
  UserSettingsShell,
  type UserSettingsNavGroup,
} from "@/components/settings/UserSettingsShell";
import { appNotice } from "@/stores/dialog-store";
import type { AuthSession } from "@/types/auth";
import type { OrgBrandingSettings } from "@/types/org-branding";
import type { TeamOrganization } from "@/types/team-org";
import "@/styles/admin-settings.css";
import "@/styles/billing-ui.css";

type TeamAdminNavId = "organization" | "members" | "branding" | "account" | "subscription" | "cloud";

const NAV_GROUPS: UserSettingsNavGroup[] = [
  {
    label: "Organization",
    items: [
      { id: "organization", label: "Overview" },
      { id: "members", label: "Coaches & invites" },
      { id: "branding", label: "Team branding" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "account", label: "My account" },
      { id: "subscription", label: "Subscription" },
      { id: "cloud", label: "Cloud sync" },
    ],
  },
];

export function TeamAdminSettingsPanel({ session }: { session: AuthSession }) {
  const router = useRouter();
  const membership = useMemo(
    () => findOrganizationMembership(session.user.email),
    [session.user.email],
  );
  const membershipOrg = membership?.org ?? null;

  const [navId, setNavId] = useState<TeamAdminNavId>("organization");
  const [orgs, setOrgs] = useState<TeamOrganization[]>(() => {
    if (!membershipOrg) return [];
    const fresh =
      loadTeamOrganizations().find((o) => o.id === membershipOrg.id) ??
      membershipOrg;
    return [fresh];
  });
  const [draftBranding, setDraftBranding] = useState<OrgBrandingSettings>(() => {
    if (!membershipOrg) return {};
    const fresh =
      loadTeamOrganizations().find((o) => o.id === membershipOrg.id) ??
      membershipOrg;
    return fresh.branding ?? {};
  });
  const [dirty, setDirty] = useState(false);

  const currentOrg = orgs[0] ?? membershipOrg;

  const subtitle = currentOrg
    ? `Team Administrator — ${currentOrg.name}`
    : `Team Administrator — ${session.user.displayName}`;

  function persistOrgs(updated: TeamOrganization) {
    const all = loadTeamOrganizations().map((o) =>
      o.id === updated.id ? updated : o,
    );
    saveTeamOrganizations(all);
    setOrgs([updated]);
  }

  async function handleApply() {
    const working = orgs[0];
    if (!working) return;
    persistOrgs({ ...working, branding: draftBranding });
    setDirty(false);
    appNotice("Saved", `Changes for ${working.name} were saved.`);
  }

  async function handleClose() {
    if (!(await confirmDiscardSettings(dirty))) return;
    router.push("/library");
  }

  if (!membershipOrg) {
    return (
      <UserSettingsShell
        className="fc-team-admin-settings"
        subtitle={subtitle}
        navGroups={NAV_GROUPS}
        navId="account"
        onNavChange={() => {}}
        dirty={false}
        onApply={() => {}}
        onClose={handleClose}
      >
        <p className="org-settings-hint">
          No organization is linked to your account yet. Ask the platform
          administrator to assign you as Team Admin.
        </p>
        <AccountSystemSection session={session} showPasswordForm />
      </UserSettingsShell>
    );
  }

  return (
    <UserSettingsShell
      className="fc-team-admin-settings"
      subtitle={subtitle}
      navGroups={NAV_GROUPS}
      navId={navId}
      onNavChange={(id) => setNavId(id as TeamAdminNavId)}
      dirty={dirty}
      onApply={() => void handleApply()}
      onClose={handleClose}
    >
      {navId === "organization" && currentOrg ? (
        <section className="org-settings-group is-active-section">
          <div className="org-settings-group-title">{currentOrg.name}</div>
          <dl className="admin-user-detail-grid">
            <div>
              <dt>Team admin</dt>
              <dd>{currentOrg.teamAdminEmail}</dd>
            </div>
            <div>
              <dt>Coach seats</dt>
              <dd>
                {currentOrg.coaches.length} / {currentOrg.coachSeats}
              </dd>
            </div>
            <div>
              <dt>Subscription</dt>
              <dd>
                {isOrganizationSubscriptionActive(currentOrg)
                  ? formatOrgExpiry(currentOrg.expiresAt)
                  : "Expired"}
              </dd>
            </div>
            <div>
              <dt>Your access</dt>
              <dd>
                {session.user.expiresAt
                  ? `Until ${formatExpiryLabel(session.user.expiresAt)}`
                  : "Active"}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {navId === "members" ? (
        <TeamOrganizationsSection
          variant="team_admin"
          orgs={orgs}
          onChange={(next) => {
            setOrgs(next);
            setDirty(true);
          }}
        />
      ) : null}

      {navId === "branding" && currentOrg ? (
        <OrgBrandingSection
          branding={draftBranding}
          orgName={currentOrg.name}
          onChange={(next) => {
            setDraftBranding(next);
            setDirty(true);
          }}
        />
      ) : null}

      {navId === "account" ? (
        <AccountSystemSection session={session} showPasswordForm />
      ) : null}

      {navId === "subscription" ? <SubscriptionSection user={session.user} /> : null}

      {navId === "cloud" ? <CloudSyncSection session={session} /> : null}
    </UserSettingsShell>
  );
}
