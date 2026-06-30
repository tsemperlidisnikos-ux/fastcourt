import type { SessionUser } from "@/types/auth";
import { hasFullAccess } from "@/lib/auth/roles";
import {
  findOrganizationMembership,
  hasOrganizationSubscriptionAccess,
  isOrganizationSubscriptionActive,
  organizationGrantsAppAccess,
} from "@/lib/auth/org-access";

export function getAccessError(user: SessionUser | null): string | null {
  if (!user || hasFullAccess(user)) return null;

  const membership = findOrganizationMembership(user.email);
  if (membership && organizationGrantsAppAccess(membership)) {
    return null;
  }

  if (hasOrganizationSubscriptionAccess(user)) {
    return null;
  }

  if (user.accessType === "subscription") {
    return null;
  }

  if (membership && !isOrganizationSubscriptionActive(membership.org)) {
    return "Your team's subscription has ended. Ask your team administrator to renew, or subscribe individually.";
  }

  if (!user.expiresAt) {
    if (user.accessType === "trial") {
      return "Your free trial has ended. Subscribe to continue using FastCourt.";
    }
    return null;
  }
  if (new Date(user.expiresAt).getTime() < Date.now()) {
    return "Your free trial has ended. Subscribe to continue using FastCourt.";
  }
  return null;
}
