import type { SessionUser } from "@/types/auth";
import type { StoredPlay } from "@/types/library";
import type { TeamOrganization } from "@/types/team-org";
import {
  findOrganizationMembership,
  organizationGrantsAppAccess,
} from "@/lib/auth/org-access";
import {
  isPlatformAdminLibraryViewer,
  usesOrganizationSharedLibrary,
} from "@/lib/cloud/library-owner";
import { isMasterAdminEmail } from "@/lib/auth/roles";
import { ROLES } from "@/lib/config";

function normalizeEmail(email: string | null | undefined) {
  return (email || "").trim().toLowerCase();
}

function isActiveOrgLibraryMember(user: SessionUser): boolean {
  if (isPlatformAdminLibraryViewer(user)) return false;
  if (user.role === ROLES.admin || isMasterAdminEmail(user.email)) return false;

  if (user.accessSource === "organization") return true;
  if (user.orgMemberRole === "team_admin" || user.orgMemberRole === "coach") {
    return true;
  }
  if (user.role === ROLES.teamAdmin) return true;

  const membership = findOrganizationMembership(user.email);
  if (!membership || !organizationGrantsAppAccess(membership)) return false;
  return (
    membership.memberRole === "team_admin" || membership.memberRole === "coach"
  );
}

/** Emails allowed inside a team shared library (team admin + roster coaches). */
export function organizationLibraryMemberEmails(
  org: TeamOrganization,
): Set<string> {
  const emails = new Set<string>();
  const admin = normalizeEmail(org.teamAdminEmail);
  if (admin) emails.add(admin);
  for (const coach of org.coaches) {
    if (coach.status === "disabled") continue;
    const email = normalizeEmail(coach.email);
    if (email) emails.add(email);
  }
  return emails;
}

export function playOwnedByMasterAdmin(play: StoredPlay): boolean {
  return isMasterAdminEmail(play.ownerEmail || "");
}

/**
 * Keep only plays that belong to the org roster.
 * Always drops platform-admin / master-admin owned plays from team views.
 */
export function filterPlaysForOrganization(
  plays: StoredPlay[],
  org: TeamOrganization,
): StoredPlay[] {
  const allowedEmails = organizationLibraryMemberEmails(org);
  const allowedIds = new Set<string>();
  if (org.teamAdminUserId?.trim()) {
    allowedIds.add(org.teamAdminUserId.trim());
  }

  return plays.filter((play) => {
    const ownerEmail = normalizeEmail(play.ownerEmail);

    // Hard block: master / platform admin content never appears in team libraries.
    if (ownerEmail && isMasterAdminEmail(ownerEmail)) return false;

    if (ownerEmail) {
      return allowedEmails.has(ownerEmail);
    }

    if (play.ownerUserId && allowedIds.has(play.ownerUserId)) return true;

    // Legacy unstamped (or UUID-only teammate) plays already in the shared row.
    return true;
  });
}

/**
 * Solo libraries filter by owner.
 * Org team admins + coaches see the shared team library (org members only).
 * Platform admin sees everything (no personal filter).
 */
export function usesPersonalPlayOwnership(
  user: SessionUser,
  libraryOwnerUserId: string,
): boolean {
  if (isPlatformAdminLibraryViewer(user)) return false;
  if (isActiveOrgLibraryMember(user)) return false;
  if (usesOrganizationSharedLibrary(user, libraryOwnerUserId)) return false;
  return user.id === libraryOwnerUserId;
}

export function playOwnedBySessionUser(
  play: StoredPlay,
  user: SessionUser,
): boolean {
  const email = normalizeEmail(user.email);

  if (play.ownerUserId && play.ownerUserId === user.id) {
    if (play.ownerEmail && normalizeEmail(play.ownerEmail) !== email) return false;
    return true;
  }

  // Email match (covers older rows / platform-admin restores without ownerUserId).
  if (email && play.ownerEmail && normalizeEmail(play.ownerEmail) === email) {
    return true;
  }

  return false;
}

export function filterPlaysForLibraryScope(
  plays: StoredPlay[],
  user: SessionUser,
  libraryOwnerUserId: string,
): StoredPlay[] {
  if (isPlatformAdminLibraryViewer(user)) {
    return plays;
  }

  const membership = findOrganizationMembership(user.email);
  if (
    membership &&
    organizationGrantsAppAccess(membership) &&
    (membership.memberRole === "team_admin" ||
      membership.memberRole === "coach")
  ) {
    return filterPlaysForOrganization(plays, membership.org);
  }

  if (!usesPersonalPlayOwnership(user, libraryOwnerUserId)) {
    // Shared scope without a resolvable org — still strip master-admin plays.
    return plays.filter((play) => !playOwnedByMasterAdmin(play));
  }

  return plays.filter((play) => playOwnedBySessionUser(play, user));
}

export function stampPlayOwner(play: StoredPlay, user: SessionUser): StoredPlay {
  const email = normalizeEmail(user.email);
  return {
    ...play,
    ownerUserId: play.ownerUserId ?? user.id,
    ownerEmail: play.ownerEmail ?? email,
    ownerDisplayName:
      play.ownerDisplayName?.trim() || user.displayName?.trim() || email,
  };
}
