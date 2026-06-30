import { ensureInviteToken } from "@/lib/auth/team-invite-token";
import type { OrgMember, TeamOrganization } from "@/types/team-org";

const STORAGE_KEY = "fastcourt_team_orgs_v1";
const REMOVED_DEMO_ORG_IDS = new Set(["org-promitheas"]);

function canPersistOrganizations() {
  return typeof localStorage !== "undefined";
}

function stripRemovedDemoOrgs(orgs: TeamOrganization[]) {
  return orgs.filter((org) => !REMOVED_DEMO_ORG_IDS.has(org.id));
}

function readStore(): TeamOrganization[] {
  if (!canPersistOrganizations()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamOrganization[];
    const orgs = Array.isArray(parsed) ? stripRemovedDemoOrgs(parsed) : [];
    if (orgs.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
      writeStore(orgs);
    }
    return orgs;
  } catch {
    return [];
  }
}

function writeStore(orgs: TeamOrganization[]) {
  if (!canPersistOrganizations()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
}

export function loadTeamOrganizations(): TeamOrganization[] {
  return readStore();
}

export function saveTeamOrganizations(orgs: TeamOrganization[]) {
  writeStore(orgs);
}

export function formatOrgExpiry(expiresAt: string | null) {
  if (!expiresAt) return "No expiry set";
  try {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) return "No expiry set";
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
  } catch {
    return "No expiry set";
  }
}

export function formatCoachSeatSummary(org: TeamOrganization) {
  const active = org.coaches.filter((c) => c.status === "active").length;
  const invited = org.coaches.filter((c) => c.status === "invited").length;
  const used = org.coaches.length;
  const available = Math.max(0, org.coachSeats - used);
  return `${used} / ${org.coachSeats} coach seats · ${active} active · ${invited} invited · ${available} available`;
}

export function orgCoachCount(org: TeamOrganization) {
  return org.coaches.length;
}

export function canAddCoach(org: TeamOrganization) {
  return org.coaches.length < org.coachSeats;
}

export function newOrgMember(
  email: string,
  role: OrgMember["role"],
  options: { invited?: boolean } = {},
): OrgMember {
  const normalized = email.trim().toLowerCase();
  const invited = options.invited ?? role === "coach";
  return {
    id: `member-${normalized.replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
    email: normalized,
    role,
    status: invited ? "invited" : "active",
    inviteToken: invited ? ensureInviteToken() : undefined,
  };
}

export function newOrganization(input: {
  name: string;
  teamAdminEmail: string;
  coachSeats: number;
  expiresAt: string | null;
}): TeamOrganization {
  return {
    id: `org-${Date.now()}`,
    name: input.name.trim(),
    teamAdminEmail: input.teamAdminEmail.trim().toLowerCase(),
    coachSeats: Math.max(1, Math.min(50, input.coachSeats)),
    expiresAt: input.expiresAt,
    createdAt: new Date().toISOString(),
    coaches: [],
    players: [],
  };
}
