import { ROLES } from "@/lib/config";
import type { SessionUser } from "@/types/auth";
import type { OrgMemberRole, TeamOrganization } from "@/types/team-org";
import {
  loadTeamOrganizations,
  newOrganization,
  saveTeamOrganizations,
} from "@/lib/auth/team-organizations";

export type OrgMemberKind = OrgMemberRole | "team_admin";

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  memberRole: OrgMemberKind;
  memberId: string;
  memberStatus: string;
  org: TeamOrganization;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isOrganizationSubscriptionActive(org: TeamOrganization): boolean {
  if (!org.expiresAt) return true;
  const end = new Date(org.expiresAt).getTime();
  return Number.isFinite(end) && end > Date.now();
}

export function getOrganizationById(orgId: string): TeamOrganization | null {
  return loadTeamOrganizations().find((org) => org.id === orgId) ?? null;
}

export function getTeamAdminOrganization(email: string): TeamOrganization | null {
  const membership = findOrganizationMembership(email);
  if (!membership || membership.memberRole !== "team_admin") return null;
  return membership.org;
}

export function findOrganizationMembership(
  email: string,
): OrganizationMembership | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  for (const org of loadTeamOrganizations()) {
    if (normalizeEmail(org.teamAdminEmail) === normalized) {
      return {
        organizationId: org.id,
        organizationName: org.name,
        memberRole: "team_admin",
        memberId: `admin-${org.id}`,
        memberStatus: "active",
        org,
      };
    }

    for (const coach of org.coaches) {
      if (
        normalizeEmail(coach.email) === normalized &&
        coach.status !== "disabled"
      ) {
        return {
          organizationId: org.id,
          organizationName: org.name,
          memberRole: coach.role,
          memberId: coach.id,
          memberStatus: coach.status,
          org,
        };
      }
    }

    for (const player of org.players) {
      if (
        normalizeEmail(player.email) === normalized &&
        player.status !== "disabled"
      ) {
        return {
          organizationId: org.id,
          organizationName: org.name,
          memberRole: player.role,
          memberId: player.id,
          memberStatus: player.status,
          org,
        };
      }
    }
  }

  return null;
}

export function organizationGrantsAppAccess(
  membership: OrganizationMembership | null,
): boolean {
  if (!membership) return false;
  if (!isOrganizationSubscriptionActive(membership.org)) return false;
  if (membership.memberStatus === "disabled") return false;
  if (membership.memberRole === "player") return true;
  // Invited coaches share the team library as soon as they appear on the roster.
  return (
    membership.memberStatus === "active" ||
    membership.memberStatus === "invited" ||
    membership.memberRole === "team_admin"
  );
}

export function applyOrganizationAccess(user: SessionUser): SessionUser {
  const membership = findOrganizationMembership(user.email);
  if (!membership) return user;

  const enriched: SessionUser = {
    ...user,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    orgMemberRole: membership.memberRole,
  };

  if (!organizationGrantsAppAccess(membership)) {
    return enriched;
  }

  const role =
    membership.memberRole === "team_admin"
      ? ROLES.teamAdmin
      : user.role === ROLES.admin
        ? ROLES.admin
        : ROLES.coach;

  return {
    ...enriched,
    role,
    accessType: "subscription",
    expiresAt: membership.org.expiresAt,
    accessSource: "organization",
  };
}

export function hasOrganizationSubscriptionAccess(user: SessionUser): boolean {
  return user.accessSource === "organization" && user.accessType === "subscription";
}

export type AcceptTeamInviteResult =
  | { ok: true; membership: OrganizationMembership }
  | { ok: false; reason: string };

function inviteTokenMatches(stored: string | undefined, provided: string) {
  const normalized = provided.trim().toLowerCase();
  if (!normalized || !stored) return false;
  return stored.toLowerCase() === normalized;
}

export function acceptTeamInvite(
  invite: {
    token: string;
    email: string;
    memberRole: OrgMemberKind;
    organizationId: string;
    memberId: string;
    organizationName?: string;
    teamAdminEmail?: string;
    coachSeats?: number;
    expiresAt?: string | null;
  },
  userEmail: string,
): AcceptTeamInviteResult {
  const normalizedUser = normalizeEmail(userEmail);
  const normalizedInvite = normalizeEmail(invite.email);

  if (!normalizedUser || normalizedUser !== normalizedInvite) {
    return {
      ok: false,
      reason: "This invitation was sent to a different email address.",
    };
  }

  const orgs = loadTeamOrganizations();
  let orgIndex = orgs.findIndex((org) => org.id === invite.organizationId);
  if (orgIndex < 0) {
    const adminEmail = normalizeEmail(invite.teamAdminEmail ?? "");
    const orgName = invite.organizationName?.trim() ?? "";
    if (!adminEmail || !orgName) {
      return { ok: false, reason: "This team invitation is no longer valid." };
    }

    const stub = newOrganization({
      name: orgName,
      teamAdminEmail: adminEmail,
      coachSeats: invite.coachSeats ?? 10,
      expiresAt: invite.expiresAt ?? null,
    });
    stub.id = invite.organizationId;
    if (invite.memberRole === "coach") {
      stub.coaches = [
        {
          id: invite.memberId,
          email: normalizedInvite,
          role: "coach",
          status: "invited",
          inviteToken: invite.token,
        },
      ];
    } else if (invite.memberRole === "player") {
      stub.players = [
        {
          id: invite.memberId,
          email: normalizedInvite,
          role: "player",
          status: "invited",
          inviteToken: invite.token,
        },
      ];
    } else {
      stub.teamAdminInviteToken = invite.token;
    }
    orgs.push(stub);
    orgIndex = orgs.length - 1;
    saveTeamOrganizations(orgs);
  }

  const org = orgs[orgIndex]!;

  if (invite.memberRole === "team_admin") {
    if (normalizeEmail(org.teamAdminEmail) !== normalizedUser) {
      return { ok: false, reason: "This team administrator invitation is invalid." };
    }
    if (!inviteTokenMatches(org.teamAdminInviteToken, invite.token)) {
      return { ok: false, reason: "This team invitation is no longer valid." };
    }
    const updatedOrg: TeamOrganization = {
      ...org,
      teamAdminInviteToken: undefined,
    };
    orgs[orgIndex] = updatedOrg;
    saveTeamOrganizations(orgs);
    return {
      ok: true,
      membership: {
        organizationId: updatedOrg.id,
        organizationName: updatedOrg.name,
        memberRole: "team_admin",
        memberId: invite.memberId,
        memberStatus: "active",
        org: updatedOrg,
      },
    };
  }

  const listName = invite.memberRole === "player" ? "players" : "coaches";
  const members = org[listName];
  const memberIndex = members.findIndex((member) => member.id === invite.memberId);
  if (memberIndex < 0) {
    return { ok: false, reason: "This invitation link has expired." };
  }

  const member = members[memberIndex]!;
  if (member.status === "disabled") {
    return { ok: false, reason: "Your team access has been disabled." };
  }
  if (!inviteTokenMatches(member.inviteToken, invite.token)) {
    return { ok: false, reason: "This invitation link has expired." };
  }

  const updatedMember = {
    ...member,
    email: normalizedUser,
    status: "active" as const,
    inviteToken: undefined,
  };
  const updatedOrg: TeamOrganization = {
    ...org,
    [listName]: members.map((entry, index) =>
      index === memberIndex ? updatedMember : entry,
    ),
  };

  orgs[orgIndex] = updatedOrg;
  saveTeamOrganizations(orgs);

  return {
    ok: true,
    membership: {
      organizationId: updatedOrg.id,
      organizationName: updatedOrg.name,
      memberRole: invite.memberRole,
      memberId: updatedMember.id,
      memberStatus: updatedMember.status,
      org: updatedOrg,
    },
  };
}
