"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  buildTeamInviteUrl,
  ensureInviteToken,
} from "@/lib/auth/team-invite";
import {
  canAddCoach,
  formatCoachSeatSummary,
  formatOrgExpiry,
  newOrgMember,
  newOrganization,
  orgCoachCount,
} from "@/lib/auth/team-organizations";
import type { TeamOrganization } from "@/types/team-org";
import { appConfirm, appCopyLink, appNotice } from "@/stores/dialog-store";

function memberStatusClass(status: string) {
  if (status === "active") return "admin-status-active";
  if (status === "invited") return "admin-status-trial";
  return "admin-status-expired";
}

function memberStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "invited") return "Invited";
  return "Disabled";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function TeamOrganizationsSection({
  orgs,
  onChange,
}: {
  orgs: TeamOrganization[];
  onChange: (next: TeamOrganization[]) => void;
}) {
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [coachSeats, setCoachSeats] = useState(5);
  const [expiresAt, setExpiresAt] = useState("");
  const [coachEmails, setCoachEmails] = useState<Record<string, string>>({});
  const [playerEmails, setPlayerEmails] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const sortedOrgs = useMemo(
    () => [...orgs].sort((a, b) => a.name.localeCompare(b.name)),
    [orgs],
  );

  const canSubmit = name.trim().length > 0 && isValidEmail(adminEmail.trim());

  function updateOrg(orgId: string, updater: (org: TeamOrganization) => TeamOrganization) {
    onChange(orgs.map((org) => (org.id === orgId ? updater(org) : org)));
  }

  function handleCreate(e?: FormEvent) {
    e?.preventDefault();
    setFormSuccess(null);

    const orgName = name.trim();
    const email = adminEmail.trim().toLowerCase();

    if (!orgName) {
      setFormError("Enter an organization / club name.");
      return;
    }
    if (!isValidEmail(email)) {
      setFormError("Enter a valid Team Admin email.");
      return;
    }

    const created = newOrganization({
      name: orgName,
      teamAdminEmail: email,
      coachSeats,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });

    onChange([...orgs, created]);
    setName("");
    setAdminEmail("");
    setCoachSeats(5);
    setExpiresAt("");
    setFormError(null);
    setFormSuccess(`Created “${created.name}”. Saved automatically.`);
  }

  async function handleDeleteOrg(org: TeamOrganization) {
    const confirmed = await appConfirm({
      title: "Delete organization",
      message: `Delete organization "${org.name}"?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    onChange(orgs.filter((o) => o.id !== org.id));
    setFormSuccess(`Deleted “${org.name}”.`);
  }

  function handleAddCoach(org: TeamOrganization) {
    const email = (coachEmails[org.id] ?? "").trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      setFormError("Enter a valid coach email.");
      return;
    }
    if (!canAddCoach(org)) {
      setFormError("Coach seat limit reached.");
      return;
    }
    if (org.coaches.some((c) => c.email === email)) return;
    updateOrg(org.id, (prev) => ({
      ...prev,
      coaches: [...prev.coaches, newOrgMember(email, "coach")],
    }));
    setCoachEmails((prev) => ({ ...prev, [org.id]: "" }));
    setFormError(null);
  }

  function handleAddPlayer(org: TeamOrganization) {
    const email = (playerEmails[org.id] ?? "").trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      setFormError("Enter a valid player email.");
      return;
    }
    if (org.players.some((p) => p.email === email)) return;
    updateOrg(org.id, (prev) => ({
      ...prev,
      players: [...prev.players, newOrgMember(email, "player")],
    }));
    setPlayerEmails((prev) => ({ ...prev, [org.id]: "" }));
    setFormError(null);
  }

  function toggleCoachAccess(orgId: string, memberId: string) {
    updateOrg(orgId, (prev) => ({
      ...prev,
      coaches: prev.coaches.map((c) =>
        c.id === memberId
          ? {
              ...c,
              status: c.status === "active" ? "disabled" : "active",
            }
          : c,
      ),
    }));
  }

  async function copyCoachInvite(org: TeamOrganization, coachId: string) {
    const coach = org.coaches.find((c) => c.id === coachId);
    if (!coach) return;
    const token = ensureInviteToken(coach.inviteToken);
    if (!coach.inviteToken) {
      updateOrg(org.id, (prev) => ({
        ...prev,
        coaches: prev.coaches.map((c) =>
          c.id === coachId
            ? { ...c, inviteToken: token, status: "invited" as const }
            : c,
        ),
      }));
    }
    const url = buildTeamInviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setFormSuccess(`Invite link copied for ${coach.email}.`);
      setFormError(null);
    } catch {
      appCopyLink("Copy invite link", url);
    }
  }

  function removeCoach(orgId: string, memberId: string) {
    updateOrg(orgId, (prev) => ({
      ...prev,
      coaches: prev.coaches.filter((c) => c.id !== memberId),
    }));
  }

  return (
    <div className="admin-organizations-panel" id="admin-organizations-panel">
      <div className="admin-billing-head">
        <div>
          <div className="admin-content-overview-title">Team organizations</div>
          <div className="admin-billing-help">
            Create a team, assign a Team Admin email, and add coach users below
            each organization. Changes save immediately.
          </div>
        </div>
      </div>

      {formError ? (
        <div className="fc-settings-alert fc-settings-alert-error" role="alert">
          {formError}
        </div>
      ) : null}
      {formSuccess ? (
        <div className="fc-settings-alert fc-settings-alert-success" role="status">
          {formSuccess}
        </div>
      ) : null}

      <form className="admin-org-create-form" onSubmit={handleCreate}>
        <div className="admin-billing-row">
          <label className="admin-billing-field">
            <span>Organization / club name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormError(null);
              }}
              placeholder="e.g. Panathinaikos Academy"
              required
            />
          </label>
          <label className="admin-billing-field">
            <span>Team Admin email</span>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => {
                setAdminEmail(e.target.value);
                setFormError(null);
              }}
              placeholder="director@club.com"
              autoComplete="off"
              required
            />
          </label>
        </div>

        <div className="admin-billing-row">
          <label className="admin-billing-field">
            <span>Coach seats</span>
            <input
              type="number"
              min={1}
              max={50}
              value={coachSeats}
              onChange={(e) => setCoachSeats(Number(e.target.value) || 5)}
            />
          </label>
          <label className="admin-billing-field">
            <span>Subscription expires (optional)</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          className="admin-billing-save-btn admin-billing-save-btn-primary"
          disabled={!canSubmit}
        >
          Create organization
        </button>
        {!canSubmit ? (
          <p className="admin-org-create-hint">
            Fill in organization name and a valid Team Admin email to enable the
            button.
          </p>
        ) : null}
      </form>

      <div className="admin-organizations-list">
        {sortedOrgs.length === 0 ? (
          <div className="admin-license-empty">
            No team organizations yet. Create one above.
          </div>
        ) : (
          sortedOrgs.map((org) => (
            <div key={org.id} className="admin-org-card">
              <div className="admin-org-card-head">
                <div className="admin-org-card-head-row">
                  <strong>{org.name}</strong>
                  <div className="admin-org-card-head-actions">
                    <button
                      type="button"
                      className="admin-view-all-btn admin-org-view-library"
                      onClick={() =>
                        appNotice(
                          "Coming in Phase 4",
                          `Team library for ${org.name} will be available in a future release.`,
                        )
                      }
                    >
                      View team library
                    </button>
                    <button
                      type="button"
                      className="admin-org-delete-btn"
                      onClick={() => handleDeleteOrg(org)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <span className="admin-org-card-meta">
                  {orgCoachCount(org)} / {org.coachSeats} coach seats · Team
                  Admin: {org.teamAdminEmail || "—"}
                </span>
              </div>

              <div className="admin-org-card-sub">
                Subscription until: {formatOrgExpiry(org.expiresAt)}
              </div>

              <div className="admin-org-members">
                <div className="admin-org-seat-summary">
                  {formatCoachSeatSummary(org)}
                </div>

                <div className="admin-billing-row">
                  <label className="admin-billing-field admin-billing-field-grow">
                    <span>Coach email</span>
                    <input
                      type="email"
                      value={coachEmails[org.id] ?? ""}
                      onChange={(e) =>
                        setCoachEmails((prev) => ({
                          ...prev,
                          [org.id]: e.target.value,
                        }))
                      }
                      placeholder="coach@club.com"
                      autoComplete="off"
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-billing-save-btn"
                    onClick={() => handleAddCoach(org)}
                  >
                    Add coach
                  </button>
                </div>

                <div className="admin-billing-row">
                  <label className="admin-billing-field admin-billing-field-grow">
                    <span>Player email</span>
                    <input
                      type="email"
                      value={playerEmails[org.id] ?? ""}
                      onChange={(e) =>
                        setPlayerEmails((prev) => ({
                          ...prev,
                          [org.id]: e.target.value,
                        }))
                      }
                      placeholder="player@club.com"
                      autoComplete="off"
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-billing-save-btn"
                    onClick={() => handleAddPlayer(org)}
                  >
                    Add player
                  </button>
                </div>

                <div className="admin-users-wrap">
                  <table className="admin-org-users-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Access</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {org.coaches.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="admin-org-card-meta">
                            No coaches added yet.
                          </td>
                        </tr>
                      ) : (
                        org.coaches.map((coach) => (
                          <tr key={coach.id}>
                            <td>{coach.email}</td>
                            <td>
                              <span
                                className={`admin-status ${memberStatusClass(coach.status)}`}
                              >
                                {memberStatusLabel(coach.status)}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-expiry-btn"
                                onClick={() =>
                                  toggleCoachAccess(org.id, coach.id)
                                }
                              >
                                {coach.status === "active" ? "Disable" : "Enable"}
                              </button>
                              {coach.status === "invited" ? (
                                <button
                                  type="button"
                                  className="admin-expiry-btn"
                                  onClick={() => void copyCoachInvite(org, coach.id)}
                                >
                                  Copy invite
                                </button>
                              ) : null}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-delete-btn"
                                onClick={() => removeCoach(org.id, coach.id)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="admin-org-card-meta admin-org-players-label">
                  Players (view-only)
                </div>
                <div className="admin-users-wrap">
                  <table className="admin-org-users-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {org.players.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="admin-org-card-meta">
                            No players added yet.
                          </td>
                        </tr>
                      ) : (
                        org.players.map((player) => (
                          <tr key={player.id}>
                            <td>{player.email}</td>
                            <td>Player</td>
                            <td>
                              <span className="admin-status admin-status-active">
                                Active
                              </span>
                            </td>
                            <td />
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
