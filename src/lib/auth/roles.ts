import { getAdminBootstrapEmails, ROLES, type Role } from "@/lib/config";
import type { SessionUser } from "@/types/auth";

export function isMasterAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return getAdminBootstrapEmails().includes(normalized);
}

export function resolveSignupRole(email: string): Role {
  return isMasterAdminEmail(email) ? ROLES.admin : ROLES.coach;
}

export function isAdminUser(user: SessionUser | null | undefined) {
  return user?.role === ROLES.admin;
}

export function isTeamAdminUser(user: SessionUser | null | undefined) {
  if (!user) return false;
  return user.role === ROLES.teamAdmin || user.orgMemberRole === "team_admin";
}

export function hasFullAccess(user: SessionUser | null | undefined) {
  if (!user) return false;
  if (user.role === ROLES.admin) return true;
  return user.accessType === "unlimited";
}
