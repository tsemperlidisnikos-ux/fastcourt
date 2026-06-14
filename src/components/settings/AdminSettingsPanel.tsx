"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_BUILD, APP_NAME } from "@/lib/config";
import {
  addDaysToExpiry,
  DEFAULT_TRIAL_DAYS,
  ensureAdminUserRegistry,
  expiryDateInputValue,
  expiryTimeInputValue,
  formatAuthDate,
  formatExpiryLabel,
  getInitials,
  getRoleLabel,
  getStatusClass,
  getStatusLabel,
  isAdminRecord,
  mergeExpiryInputs,
  saveAdminUsers,
} from "@/lib/auth/admin-users";
import {
  loadTeamOrganizations,
  saveTeamOrganizations,
} from "@/lib/auth/team-organizations";
import { applyAdminRegistryToSession } from "@/lib/auth/admin-users";
import { AdminLibraryContentModal } from "@/components/settings/AdminLibraryContentModal";
import { AccountSystemSection } from "@/components/settings/AccountSystemSection";
import { AppearanceSettingsSection } from "@/components/settings/AppearanceSettingsSection";
import { BillingSection } from "@/components/settings/BillingSection";
import { PdfBrandingSection } from "@/components/settings/PdfBrandingSection";
import { TeamOrganizationsSection } from "@/components/settings/TeamOrganizationsSection";
import { ToolsSection } from "@/components/settings/ToolsSection";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import { appConfirm } from "@/stores/dialog-store";
import {
  summarizeAllCoachLibraries,
  summarizeCoachLibrary,
  type AdminLibrarySummary,
} from "@/lib/library/admin-library-summary";
import { listStoredPlays } from "@/lib/library/idb";
import { getPlaybookSections } from "@/lib/library/meta";
import type { AuthSession } from "@/types/auth";
import type { AdminUserRecord } from "@/types/admin-user";
import type { TeamOrganization } from "@/types/team-org";
import "@/styles/admin-settings.css";

type NavId =
  | "all-users"
  | "team-organizations"
  | "billing"
  | "appearance"
  | "pdf-branding"
  | "account"
  | "tools";

type NavItem = { id: NavId; label: string; kind: "embed" | "section" };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Administration",
    items: [
      { id: "all-users", label: "All users", kind: "embed" },
      { id: "team-organizations", label: "Team organizations", kind: "embed" },
      { id: "billing", label: "Billing & setup", kind: "embed" },
      { id: "appearance", label: "Appearance", kind: "section" },
    ],
  },
  {
    label: "Branding",
    items: [{ id: "pdf-branding", label: "Team & PDF branding", kind: "section" }],
  },
  {
    label: "System",
    items: [
      { id: "account", label: "Account & system", kind: "section" },
      { id: "tools", label: "Import & export", kind: "section" },
    ],
  },
];

type ProfileMode = "view" | "create" | "edit";

function listItemClass(user: AdminUserRecord, selected: boolean) {
  const parts = ["admin-all-users-list-item"];
  if (selected) parts.push("is-selected");
  if (isAdminRecord(user)) parts.push("is-admin");
  if (user.role === "team_admin") parts.push("is-team-admin");
  return parts.join(" ");
}

function UserListItem({
  user,
  selected,
  onSelect,
}: {
  user: AdminUserRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const orgLine = user.organization
    ? `${user.organization}${user.role === "coach" ? " — Coach" : ""}`
    : getRoleLabel(user);

  return (
    <button
      type="button"
      className={listItemClass(user, selected)}
      onClick={onSelect}
    >
      <div className="admin-all-users-list-card">
        <div className="admin-all-users-list-avatar">{getInitials(user.displayName)}</div>
        <div className="admin-all-users-list-body">
          <span className="admin-all-users-list-name">{user.displayName}</span>
          <span className="admin-all-users-list-email">{user.email}</span>
          <div className="admin-all-users-list-meta">
            <span className="admin-all-users-list-role">{orgLine}</span>
            <span className={`admin-status ${getStatusClass(user)}`}>
              {getStatusLabel(user)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ManageAccessSection({
  user,
  draft,
  onDraftChange,
}: {
  user: AdminUserRecord;
  draft: AdminUserRecord;
  onDraftChange: (next: AdminUserRecord) => void;
}) {
  if (isAdminRecord(user)) {
    return (
      <p className="admin-user-detail-muted">
        Administrator account — access is always unlimited.
      </p>
    );
  }

  const dateVal = expiryDateInputValue(draft.expiresAt);
  const timeVal = expiryTimeInputValue(draft.expiresAt);

  function applyDays(days: number) {
    const next = addDaysToExpiry(days, draft.expiresAt);
    onDraftChange({
      ...draft,
      expiresAt: next,
      accessType: days >= 365 ? "subscription" : draft.accessType,
    });
  }

  return (
    <div className="admin-expiry-controls">
      <div className="admin-trial-row">
        <label className="admin-trial-label">Trial period</label>
        <input
          type="number"
          className="admin-trial-days"
          min={1}
          max={365}
          value={draft.trialDays ?? DEFAULT_TRIAL_DAYS}
          onChange={(e) =>
            onDraftChange({
              ...draft,
              trialDays: Number(e.target.value) || DEFAULT_TRIAL_DAYS,
            })
          }
          aria-label="Trial days"
        />
        <span className="admin-trial-unit">days</span>
        <button
          type="button"
          className="admin-expiry-btn admin-set-trial-btn"
          onClick={() => {
            const days = draft.trialDays ?? DEFAULT_TRIAL_DAYS;
            const end = addDaysToExpiry(days);
            onDraftChange({
              ...draft,
              accessType: "trial",
              expiresAt: end,
            });
          }}
        >
          Apply trial
        </button>
      </div>
      <div className="admin-expiry-datetime">
        <input
          type="date"
          className="admin-expiry-date"
          value={dateVal}
          onChange={(e) => {
            const merged = mergeExpiryInputs(e.target.value, timeVal);
            onDraftChange({ ...draft, expiresAt: merged });
          }}
          aria-label="Access until date"
        />
        <input
          type="time"
          className="admin-expiry-time"
          value={timeVal}
          onChange={(e) => {
            const merged = mergeExpiryInputs(dateVal, e.target.value);
            onDraftChange({ ...draft, expiresAt: merged });
          }}
          aria-label="Access until time"
        />
      </div>
      <div className="admin-expiry-quick">
        <button type="button" className="admin-expiry-btn" onClick={() => applyDays(30)}>
          +30d
        </button>
        <button type="button" className="admin-expiry-btn" onClick={() => applyDays(90)}>
          +90d
        </button>
        <button type="button" className="admin-expiry-btn" onClick={() => applyDays(365)}>
          +1y
        </button>
        <button
          type="button"
          className="admin-expiry-btn"
          onClick={() =>
            onDraftChange({
              ...draft,
              accessType: "subscription",
              expiresAt: addDaysToExpiry(365),
            })
          }
        >
          Paid +1y
        </button>
        <button
          type="button"
          className="admin-expiry-btn"
          onClick={() =>
            onDraftChange({
              ...draft,
              accessType: "unlimited",
              expiresAt: null,
            })
          }
        >
          ∞
        </button>
      </div>
    </div>
  );
}

function UserDetail({
  user,
  draft,
  onDraftChange,
  profileMode,
  onEdit,
  onDelete,
  onViewContent,
  onBackup,
}: {
  user: AdminUserRecord | null;
  draft: AdminUserRecord | null;
  onDraftChange: (next: AdminUserRecord) => void;
  profileMode: ProfileMode;
  onEdit: () => void;
  onDelete: () => void;
  onViewContent: () => void;
  onBackup: () => void;
}) {
  if (profileMode === "create" || profileMode === "edit") return null;
  if (!user || !draft) {
    return (
      <div className="admin-all-users-detail-empty">
        Select a user from the list, or click <b>Add profile</b> to create one.
      </div>
    );
  }

  const signupMeta =
    user.signupComplete && !isAdminRecord(user) && user.organization
      ? `Coach · ${user.organization}`
      : "";

  return (
    <div className="admin-user-detail">
      <div className="admin-user-detail-top">
        <header className="admin-user-detail-head">
          <h3 className="admin-user-detail-name">{user.displayName}</h3>
          <p className="admin-user-detail-email">{user.email}</p>
          {signupMeta ? (
            <p className="admin-user-detail-signup">{signupMeta}</p>
          ) : null}
        </header>
        <div className="admin-user-detail-toolbar">
          {!isAdminRecord(user) ? (
            <>
              <button type="button" className="admin-expiry-btn" onClick={onEdit}>
                Edit profile
              </button>
              <button
                type="button"
                className="admin-delete-btn"
                onClick={onDelete}
              >
                Delete profile
              </button>
            </>
          ) : null}
          <button type="button" className="admin-expiry-btn" onClick={onBackup}>
            Backup user
          </button>
        </div>
      </div>

      <div className="admin-user-detail-columns">
        <section className="admin-user-detail-section admin-user-detail-section-account">
          <h4 className="admin-user-detail-section-title">Account</h4>
          <dl className="admin-user-detail-grid">
            <div>
              <dt>Role</dt>
              <dd>{getRoleLabel(user)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`admin-status ${getStatusClass(user)}`}>
                  {getStatusLabel(user)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Signed up</dt>
              <dd>{formatAuthDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Access until</dt>
              <dd>
                {isAdminRecord(user)
                  ? "Unlimited"
                  : formatExpiryLabel(draft.expiresAt)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="admin-user-detail-section admin-user-detail-section-library">
          <h4 className="admin-user-detail-section-title">Library</h4>
          {isAdminRecord(user) ? (
            <p className="admin-user-detail-muted">
              Administrator account — no coach library.
            </p>
          ) : (
            <div className="admin-user-detail-library">
              <p>Coach library (local)</p>
              <button
                type="button"
                className="admin-view-library-btn"
                onClick={onViewContent}
              >
                View content
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="admin-user-detail-columns">
        <section className="admin-user-detail-section admin-user-detail-section-manage">
          <h4 className="admin-user-detail-section-title">Manage access</h4>
          <ManageAccessSection
            user={user}
            draft={draft}
            onDraftChange={onDraftChange}
          />
        </section>

        <section className="admin-user-detail-section admin-user-detail-section-devices">
          <h4 className="admin-user-detail-section-title">Devices &amp; login</h4>
          {isAdminRecord(user) ? (
            <p className="admin-user-detail-muted">
              Administrator account — no device limits.
            </p>
          ) : (
            <p className="admin-user-detail-muted">
              Device limits and login history sync in cloud mode (Phase 4).
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function ProfileForm({
  mode,
  initial,
  onSave,
  onCancel,
}: {
  mode: "create" | "edit";
  initial: Partial<AdminUserRecord>;
  onSave: (record: AdminUserRecord) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(initial.email ?? "");
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [organization, setOrganization] = useState(initial.organization ?? "");

  return (
    <div className="admin-user-profile-form">
      <h3 className="admin-user-detail-name">
        {mode === "create" ? "Add profile" : "Edit profile"}
      </h3>
      <label className="org-settings-brand-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          disabled={mode === "edit"}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="coach@club.com"
        />
      </label>
      <label className="org-settings-brand-field">
        <span>Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Coach name"
        />
      </label>
      <label className="org-settings-brand-field">
        <span>Organization</span>
        <input
          type="text"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="Club / team"
        />
      </label>
      <div className="admin-user-detail-toolbar">
        <button
          type="button"
          className="admin-expiry-btn admin-expiry-btn-apply"
          onClick={() => {
            const normalized = email.trim().toLowerCase();
            if (!normalized) return;
            const trialEnd = addDaysToExpiry(DEFAULT_TRIAL_DAYS);
            onSave({
              id: initial.id ?? `user-${normalized.replace(/[^a-z0-9]/g, "-")}`,
              email: normalized,
              displayName: displayName.trim() || normalized.split("@")[0],
              role: "coach",
              accessType: "trial",
              expiresAt: trialEnd,
              createdAt: initial.createdAt ?? new Date().toISOString(),
              organization: organization.trim() || undefined,
              signupComplete: true,
              trialDays: DEFAULT_TRIAL_DAYS,
            });
          }}
        >
          Save profile
        </button>
        <button type="button" className="admin-expiry-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AdminSettingsPanel({ session }: { session: AuthSession }) {
  const router = useRouter();

  const [navId, setNavId] = useState<NavId>("all-users");
  const registryUsers = useMemo(
    () => ensureAdminUserRegistry(session.user),
    [session.user],
  );

  const [users, setUsers] = useState<AdminUserRecord[]>(registryUsers);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => registryUsers[0]?.id ?? null,
  );
  const [drafts, setDrafts] = useState<Record<string, AdminUserRecord>>(() =>
    Object.fromEntries(registryUsers.map((u) => [u.id, { ...u }])),
  );
  const [prevRegistryUsers, setPrevRegistryUsers] =
    useState<AdminUserRecord[]>(registryUsers);
  const [dirty, setDirty] = useState(false);
  const [profileMode, setProfileMode] = useState<ProfileMode>("view");
  const [profileDraft, setProfileDraft] = useState<Partial<AdminUserRecord>>({});
  const [orgs, setOrgs] = useState<TeamOrganization[]>(() =>
    loadTeamOrganizations(),
  );
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [libraryModalTitle, setLibraryModalTitle] = useState("Coach library");
  const [libraryModalSubtitle, setLibraryModalSubtitle] = useState("");
  const [libraryModalSummary, setLibraryModalSummary] =
    useState<AdminLibrarySummary | null>(null);
  const [libraryModalGroupBy, setLibraryModalGroupBy] = useState<
    "playbook" | "coach"
  >("playbook");
  const appearance = useSettingsStore((s) => s.appearance);
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const appLogoDataUrl = useSettingsStore((s) => s.appLogoDataUrl);
  const billing = useSettingsStore((s) => s.billing);
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  const setPdfBrand = useSettingsStore((s) => s.setPdfBrand);
  const setAppLogo = useSettingsStore((s) => s.setAppLogo);
  const setBilling = useSettingsStore((s) => s.setBilling);
  const persistAll = useSettingsStore((s) => s.persistAll);
  const setSession = useAuthStore((s) => s.setSession);

  if (registryUsers !== prevRegistryUsers) {
    setPrevRegistryUsers(registryUsers);
    setUsers(registryUsers);
    setDrafts(Object.fromEntries(registryUsers.map((u) => [u.id, { ...u }])));
    setSelectedId((prev) =>
      prev && registryUsers.some((u) => u.id === prev)
        ? prev
        : (registryUsers[0]?.id ?? null),
    );
  }

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId],
  );

  const selectedDraft = selectedId ? drafts[selectedId] ?? null : null;

  const activeNav = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === navId);
  const showEmbed = activeNav?.kind === "embed";

  function updateDraft(next: AdminUserRecord) {
    setDrafts((prev) => ({ ...prev, [next.id]: next }));
    setDirty(true);
  }

  function handleApply() {
    if (navId === "all-users") {
      const merged = users.map((u) => drafts[u.id] ?? u);
      saveAdminUsers(merged);
      setUsers(merged);
      const self = merged.find(
        (u) => u.email.toLowerCase() === session.user.email.toLowerCase(),
      );
      if (self) {
        setSession({
          ...session,
          user: applyAdminRegistryToSession({
            ...session.user,
            displayName: self.displayName,
            role: self.role,
            accessType: self.accessType,
            expiresAt: self.expiresAt,
          }),
        });
      }
      setDirty(false);
      return;
    }

    if (navId === "billing") {
      setBilling(billing, true);
      setDirty(false);
      return;
    }

    if (navId === "team-organizations") {
      saveTeamOrganizations(orgs);
      setDirty(false);
      return;
    }

    const merged = users.map((u) => drafts[u.id] ?? u);
    saveAdminUsers(merged);
    setUsers(merged);
    saveTeamOrganizations(orgs);
    persistAll();
    setDirty(false);
  }

  async function handleClose() {
    if (
      dirty &&
      !(await appConfirm({
        title: "Discard changes",
        message: "Discard unsaved changes?",
        confirmLabel: "Discard",
        danger: true,
      }))
    ) {
      return;
    }
    router.push("/library");
  }

  function handleBackupAll() {
    const blob = new Blob([JSON.stringify(users, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fastcourt-users-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleBackupUser(user: AdminUserRecord) {
    const blob = new Blob([JSON.stringify(user, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fastcourt-user-${user.email.replace(/@.*/, "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSaveProfile(record: AdminUserRecord) {
    const exists = users.some((u) => u.id === record.id);
    const next = exists
      ? users.map((u) => (u.id === record.id ? record : u))
      : [...users, record];
    setUsers(next);
    setDrafts((prev) => ({ ...prev, [record.id]: record }));
    setSelectedId(record.id);
    setProfileMode("view");
    setDirty(true);
  }

  async function openLibraryModal(options: {
    title: string;
    subtitle?: string;
    summary: AdminLibrarySummary;
    groupBy: "playbook" | "coach";
  }) {
    setLibraryModalTitle(options.title);
    setLibraryModalSubtitle(options.subtitle ?? "");
    setLibraryModalSummary(options.summary);
    setLibraryModalGroupBy(options.groupBy);
    setLibraryModalOpen(true);
  }

  async function handleViewUserContent(user: AdminUserRecord) {
    const [plays, playbooks] = await Promise.all([
      listStoredPlays(),
      getPlaybookSections(),
    ]);
    const summary = summarizeCoachLibrary(user, plays, playbooks);
    await openLibraryModal({
      title: user.displayName || "Coach library",
      subtitle: user.email,
      summary,
      groupBy: "playbook",
    });
  }

  async function handleViewAllContent() {
    const coachUsers = users.filter((u) => !isAdminRecord(u));
    const [plays, playbooks] = await Promise.all([
      listStoredPlays(),
      getPlaybookSections(),
    ]);
    const summary = summarizeAllCoachLibraries(coachUsers, plays, playbooks);
    await openLibraryModal({
      title: "All coaches — content overview",
      subtitle: `${summary.coachesWithContent ?? 0} of ${summary.coachCount ?? 0} coaches have content on this device`,
      summary,
      groupBy: "coach",
    });
  }

  async function handleDeleteProfile(user: AdminUserRecord) {
    if (isAdminRecord(user)) return;
    const confirmed = await appConfirm({
      title: "Delete profile",
      message: `Delete profile for ${user.displayName} (${user.email})? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;

    const merged = users
      .map((u) => drafts[u.id] ?? u)
      .filter((u) => u.id !== user.id);
    saveAdminUsers(merged);
    setUsers(merged);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });
    setSelectedId((prev) => {
      if (prev !== user.id) return prev;
      return merged[0]?.id ?? null;
    });
    setProfileMode("view");
    setDirty(false);
  }

  return (
    <div className="fc-admin-settings org-settings-overlay">
      <div className="org-settings-box is-admin-mode">
        <header className="org-settings-head">
          <div>
            <h2 className="org-settings-head-title">Settings</h2>
            <p className="org-settings-head-user">
              Signed in as <b>{session.user.displayName}</b> — Master Administrator
            </p>
          </div>
        </header>

        <div className="org-settings-body">
          <div className="org-settings-workspace">
            <aside className="org-settings-nav-panel">
              <div className="org-settings-nav-list">
                {NAV_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="org-settings-nav-group-label">{group.label}</div>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`org-settings-nav-item${navId === item.id ? " is-selected" : ""}`}
                        onClick={() => {
                          setNavId(item.id);
                          setProfileMode("view");
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="org-settings-nav-footer">
                <span className="org-settings-nav-version">
                  {APP_NAME} {APP_BUILD}
                </span>
              </div>
            </aside>

            <div
              className={`org-settings-content-panel${showEmbed ? " is-showing-embed" : ""}`}
            >
              {navId === "all-users" ? (
                <div className="org-settings-embed" id="org-settings-embed-all-users">
                  <div className="admin-all-users-head-actions">
                    <button
                      type="button"
                      className="admin-view-all-btn"
                      onClick={() => {
                        setProfileMode("create");
                        setProfileDraft({});
                      }}
                    >
                      Add profile
                    </button>
                    <button
                      type="button"
                      className="admin-view-all-btn"
                      onClick={handleBackupAll}
                    >
                      Backup all
                    </button>
                    <button
                      type="button"
                      className="admin-view-all-btn"
                      onClick={() => void handleViewAllContent()}
                    >
                      View all content
                    </button>
                  </div>

                  <div className="admin-all-users-split">
                    <aside className="admin-all-users-list-panel">
                      <div className="admin-all-users-list">
                        {users.length === 0 ? (
                          <div className="admin-users-empty">No user accounts yet.</div>
                        ) : (
                          users.map((user) => (
                            <UserListItem
                              key={user.id}
                              user={drafts[user.id] ?? user}
                              selected={user.id === selectedId}
                              onSelect={() => {
                                setSelectedId(user.id);
                                setProfileMode("view");
                              }}
                            />
                          ))
                        )}
                      </div>
                    </aside>

                    <main className="admin-all-users-detail-panel">
                      {profileMode === "create" ? (
                        <ProfileForm
                          mode="create"
                          initial={profileDraft}
                          onSave={handleSaveProfile}
                          onCancel={() => setProfileMode("view")}
                        />
                      ) : profileMode === "edit" && selectedUser ? (
                        <ProfileForm
                          mode="edit"
                          initial={selectedUser}
                          onSave={handleSaveProfile}
                          onCancel={() => setProfileMode("view")}
                        />
                      ) : (
                        <UserDetail
                          user={selectedUser}
                          draft={selectedDraft}
                          onDraftChange={updateDraft}
                          profileMode={profileMode}
                          onEdit={() => setProfileMode("edit")}
                          onDelete={() =>
                            selectedUser && handleDeleteProfile(selectedUser)
                          }
                          onViewContent={() =>
                            selectedUser && void handleViewUserContent(selectedUser)
                          }
                          onBackup={() =>
                            selectedUser && handleBackupUser(selectedUser)
                          }
                        />
                      )}
                    </main>
                  </div>
                </div>
              ) : null}

              {navId === "team-organizations" ? (
                <div
                  className="org-settings-embed org-settings-embed-orgs"
                  id="org-settings-embed-team-orgs"
                >
                  <TeamOrganizationsSection
                    orgs={orgs}
                    onChange={(next) => {
                      setOrgs(next);
                      saveTeamOrganizations(next);
                      setDirty(true);
                    }}
                  />
                </div>
              ) : null}

              {navId === "billing" ? (
                <div className="org-settings-embed" id="org-settings-embed-billing">
                  <BillingSection
                    config={billing}
                    users={users.map((u) => drafts[u.id] ?? u)}
                    onChange={(next) => {
                      setBilling(next);
                      setDirty(true);
                    }}
                  />
                </div>
              ) : null}

              {!showEmbed ? (
                <div
                  className={`org-settings-section-stack${navId === "appearance" ? " is-appearance-active" : ""}`}
                >
                  {navId === "appearance" ? (
                    <AppearanceSettingsSection
                      settings={appearance}
                      onChange={(next) => {
                        setAppearance(next);
                        setDirty(true);
                      }}
                      appLogoDataUrl={appLogoDataUrl}
                      onAppLogoChange={(dataUrl) => {
                        const saved = setAppLogo(dataUrl, true);
                        if (!saved) return false;
                        return true;
                      }}
                    />
                  ) : null}

                  {navId === "pdf-branding" ? (
                    <PdfBrandingSection
                      brand={pdfBrand}
                      onChange={(next) => {
                        setPdfBrand(next);
                        setDirty(true);
                      }}
                      onLogoChange={(next) => {
                        const saved = setPdfBrand(next, true);
                        if (!saved) return false;
                        setDirty(true);
                        return true;
                      }}
                    />
                  ) : null}

                  {navId === "account" ? (
                    <AccountSystemSection session={session} />
                  ) : null}

                  {navId === "tools" ? (
                    <div className="org-settings-tools-admin">
                      <ToolsSection />
                      <div className="org-settings-tools-admin-extra">
                        <button
                          type="button"
                          className="admin-view-all-btn"
                          onClick={handleBackupAll}
                        >
                          Export users registry (JSON)
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <AdminLibraryContentModal
          open={libraryModalOpen}
          title={libraryModalTitle}
          subtitle={libraryModalSubtitle}
          summary={libraryModalSummary}
          groupBy={libraryModalGroupBy}
          onClose={() => setLibraryModalOpen(false)}
        />

        <div className="org-settings-footer">
          <div className="org-settings-footer-left">
            <span className="org-settings-build">
              {APP_NAME} {APP_BUILD}
            </span>
          </div>
          <div className="org-settings-footer-actions">
            {dirty ? (
              <span className="org-settings-dirty-hint">Unsaved changes</span>
            ) : null}
            <button
              type="button"
              className={`org-settings-apply${dirty ? " has-unsaved-changes" : ""}`}
              onClick={handleApply}
            >
              Apply
            </button>
            <button type="button" className="org-settings-close" onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
