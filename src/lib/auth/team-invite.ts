import { loadTeamOrganizations } from "@/lib/auth/team-organizations";
import type { OrgMemberRole } from "@/types/team-org";

const PENDING_INVITE_SESSION_KEY = "fastcourt_pending_team_invite_v1";

export interface PendingTeamInvite {
  token: string;
  email: string;
  memberRole: OrgMemberRole | "team_admin";
  organizationName: string;
  organizationId: string;
  memberId: string;
  status: string;
  teamAdminEmail: string;
  coachSeats?: number;
  expiresAt?: string | null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function memberRoleLabel(role: PendingTeamInvite["memberRole"]) {
  if (role === "team_admin") return "Team Administrator";
  if (role === "player") return "Player";
  return "Coach";
}

export function buildTeamInviteUrl(token: string) {
  const path = window.location.pathname || "/login";
  const origin = window.location.origin || "";
  return `${origin}${path}#team-invite=${token}`;
}

export function lookupInviteByToken(token: string): PendingTeamInvite | null {
  const normalized = String(token || "").trim().toLowerCase();
  if (!normalized) return null;

  for (const org of loadTeamOrganizations()) {
    for (const coach of org.coaches) {
      if (
        coach.inviteToken?.toLowerCase() === normalized &&
        coach.status !== "disabled"
      ) {
        return {
          token: normalized,
          email: coach.email,
          memberRole: coach.role,
          organizationName: org.name,
          organizationId: org.id,
          memberId: coach.id,
          status: coach.status,
          teamAdminEmail: org.teamAdminEmail,
          coachSeats: org.coachSeats,
          expiresAt: org.expiresAt,
        };
      }
    }
    for (const player of org.players) {
      if (
        player.inviteToken?.toLowerCase() === normalized &&
        player.status !== "disabled"
      ) {
        return {
          token: normalized,
          email: player.email,
          memberRole: player.role,
          organizationName: org.name,
          organizationId: org.id,
          memberId: player.id,
          status: player.status,
          teamAdminEmail: org.teamAdminEmail,
          coachSeats: org.coachSeats,
          expiresAt: org.expiresAt,
        };
      }
    }
    if (normalizeEmail(org.teamAdminEmail) && org.teamAdminInviteToken?.toLowerCase() === normalized) {
      return {
        token: normalized,
        email: org.teamAdminEmail,
        memberRole: "team_admin",
        organizationName: org.name,
        organizationId: org.id,
        memberId: `admin-${org.id}`,
        status: "invited",
        teamAdminEmail: org.teamAdminEmail,
        coachSeats: org.coachSeats,
        expiresAt: org.expiresAt,
      };
    }
  }
  return null;
}

export function storePendingInvite(invite: PendingTeamInvite) {
  try {
    sessionStorage.setItem(PENDING_INVITE_SESSION_KEY, JSON.stringify(invite));
  } catch {
    /* ignore */
  }
}

export function getPendingInvite(): PendingTeamInvite | null {
  try {
    const raw = sessionStorage.getItem(PENDING_INVITE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as PendingTeamInvite) : null;
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    sessionStorage.removeItem(PENDING_INVITE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function consumeInviteFromUrlHash(): PendingTeamInvite | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const match = hash.match(/team-invite=([a-f0-9]+)/i);
  if (!match) return null;
  const invite = lookupInviteByToken(match[1]);
  if (!invite) return null;
  storePendingInvite(invite);
  try {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  } catch {
    /* ignore */
  }
  return invite;
}

