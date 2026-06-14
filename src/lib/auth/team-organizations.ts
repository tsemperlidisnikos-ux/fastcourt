import { ensureInviteToken } from "@/lib/auth/team-invite-token";
import type { OrgMember, TeamOrganization } from "@/types/team-org";

const STORAGE_KEY = "fastcourt_team_orgs_v1";

function canPersistOrganizations() {
  return typeof localStorage !== "undefined";
}

function readStore(): TeamOrganization[] {
  if (!canPersistOrganizations()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TeamOrganization[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(orgs: TeamOrganization[]) {
  if (!canPersistOrganizations()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));
}

function seedOrganizations(): TeamOrganization[] {
  const now = new Date().toISOString();
  return [
    {
      id: "org-promitheas",
      name: "Promitheas Patras BC",
      teamAdminEmail: "info@promitheasbc.gr",
      coachSeats: 5,
      expiresAt: null,
      createdAt: now,
      coaches: [
        {
          id: "coach-stefania",
          email: "stefania.tomara@gmail.com",
          role: "coach",
          status: "active",
        },
        {
          id: "coach-nikos",
          email: "tsemperlidis.nikos@gmail.com",
          role: "coach",
          status: "active",
        },
      ],
      players: [],
    },
  ];
}

export function loadTeamOrganizations(): TeamOrganization[] {
  const existing = readStore();
  if (existing.length) return existing;
  const seeded = seedOrganizations();
  writeStore(seeded);
  return seeded;
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
