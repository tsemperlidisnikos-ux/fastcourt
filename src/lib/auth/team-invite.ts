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

function toBase64Url(value: string) {
  const encoded =
    typeof btoa === "function"
      ? btoa(value)
      : Buffer.from(value, "utf8").toString("base64");
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const withPad = padded + "=".repeat(padLength);
  if (typeof atob === "function") {
    return atob(withPad);
  }
  return Buffer.from(withPad, "base64").toString("utf8");
}

export function encodeInvitePayload(invite: PendingTeamInvite): string {
  return toBase64Url(JSON.stringify(invite));
}

export function decodeInvitePayload(raw: string): PendingTeamInvite | null {
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as PendingTeamInvite;
    if (
      !parsed ||
      typeof parsed.token !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.organizationId !== "string" ||
      typeof parsed.memberId !== "string" ||
      typeof parsed.teamAdminEmail !== "string"
    ) {
      return null;
    }
    return {
      ...parsed,
      token: parsed.token.trim().toLowerCase(),
      email: normalizeEmail(parsed.email),
      teamAdminEmail: normalizeEmail(parsed.teamAdminEmail),
    };
  } catch {
    return null;
  }
}

export function buildTeamInviteUrl(tokenOrInvite: string | PendingTeamInvite) {
  const path = window.location.pathname || "/login";
  const origin = window.location.origin || "";
  if (typeof tokenOrInvite === "string") {
    return `${origin}${path}#team-invite=${tokenOrInvite}`;
  }
  const token = tokenOrInvite.token.trim().toLowerCase();
  const payload = encodeInvitePayload({
    ...tokenOrInvite,
    token,
    email: normalizeEmail(tokenOrInvite.email),
    teamAdminEmail: normalizeEmail(tokenOrInvite.teamAdminEmail),
  });
  return `${origin}${path}#team-invite=${token}&d=${payload}`;
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
  const payloadMatch = hash.match(/[?&#]d=([A-Za-z0-9_-]+)/);
  if (payloadMatch?.[1]) {
    const fromPayload = decodeInvitePayload(payloadMatch[1]);
    if (fromPayload) {
      storePendingInvite(fromPayload);
      try {
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      } catch {
        /* ignore */
      }
      return fromPayload;
    }
  }

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
