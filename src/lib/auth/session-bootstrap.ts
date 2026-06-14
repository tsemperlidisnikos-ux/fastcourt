import type { AuthSession } from "@/types/auth";
import { applyAdminRegistryToSession, upsertAdminUser, sessionToAdminUser } from "@/lib/auth/admin-users";
import {
  acceptTeamInvite,
  applyOrganizationAccess,
  hasOrganizationSubscriptionAccess,
} from "@/lib/auth/org-access";
import {
  clearPendingInvite,
  getPendingInvite,
  type PendingTeamInvite,
} from "@/lib/auth/team-invite";
import { ROLES } from "@/lib/config";

export interface FinalizeAuthSessionOptions {
  pendingInvite?: PendingTeamInvite | null;
  organizationName?: string;
}

export interface FinalizeAuthSessionResult {
  session: AuthSession;
  inviteAccepted: boolean;
  inviteError: string | null;
}

function mergeRegistryAccess(session: AuthSession): AuthSession {
  const orgCovered = hasOrganizationSubscriptionAccess(session.user);
  const registryUser = applyAdminRegistryToSession(session.user);

  if (orgCovered) {
    return {
      ...session,
      user: {
        ...registryUser,
        accessType: session.user.accessType,
        expiresAt: session.user.expiresAt,
        accessSource: session.user.accessSource,
        organizationId: session.user.organizationId,
        organizationName: session.user.organizationName,
        orgMemberRole: session.user.orgMemberRole,
        role:
          session.user.orgMemberRole === "team_admin"
            ? ROLES.teamAdmin
            : registryUser.role === ROLES.admin
              ? ROLES.admin
              : registryUser.role,
      },
    };
  }

  return { ...session, user: registryUser };
}

export function finalizeAuthSession(
  session: AuthSession,
  options: FinalizeAuthSessionOptions = {},
): FinalizeAuthSessionResult {
  let inviteAccepted = false;
  let inviteError: string | null = null;
  const pendingInvite = options.pendingInvite ?? getPendingInvite();

  if (pendingInvite) {
    const result = acceptTeamInvite(pendingInvite, session.user.email);
    if (result.ok) {
      inviteAccepted = true;
      clearPendingInvite();
    } else {
      inviteError = result.reason;
    }
  }

  let user = applyOrganizationAccess(session.user);
  const merged = mergeRegistryAccess({ ...session, user });
  user = merged.user;

  if (options.organizationName?.trim() && !user.organizationName) {
    user = { ...user, organizationName: options.organizationName.trim() };
  }

  const record = sessionToAdminUser(user);
  if (user.organizationName) record.organization = user.organizationName;
  upsertAdminUser(record);

  return {
    session: { ...session, user },
    inviteAccepted,
    inviteError,
  };
}
