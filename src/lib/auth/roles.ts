import { MASTER_ADMIN_EMAIL, ROLES, type Role } from "@/lib/config";
import type { SessionUser } from "@/types/auth";

export function isMasterAdminEmail(email: string) {
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

export function resolveSignupRole(email: string): Role {
  return isMasterAdminEmail(email) ? ROLES.admin : ROLES.coach;
}

export function isAdminUser(user: SessionUser | null | undefined) {
  return user?.role === ROLES.admin;
}

export function hasFullAccess(user: SessionUser | null | undefined) {
  if (!user) return false;
  if (user.role === ROLES.admin) return true;
  return user.accessType === "unlimited";
}
