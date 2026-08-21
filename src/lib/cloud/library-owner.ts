import {
  findOrganizationMembership,
  organizationGrantsAppAccess,
} from "@/lib/auth/org-access";
import { isMasterAdminEmail } from "@/lib/auth/roles";
import { rememberTeamAdminUserId } from "@/lib/auth/team-organizations";
import { isCloudSessionUserId } from "@/lib/library/library-cache-policy";
import { createClient } from "@/lib/supabase/client";
import { ROLES } from "@/lib/config";
import type { SessionUser } from "@/types/auth";
import type { TeamOrganization } from "@/types/team-org";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LibraryOwnerLookup = (adminEmail: string) => Promise<string | null>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Stable local IndexedDB scope for a team admin email (localhost / offline). */
export function localTeamLibraryOwnerId(adminEmail: string): string {
  return `local-${normalizeEmail(adminEmail)}`;
}

export function isPlatformAdminLibraryViewer(user: SessionUser): boolean {
  return user.role === ROLES.admin;
}

export async function lookupProfileIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_profile_id_by_email", {
    target_email: normalizeEmail(email),
  });
  if (error) {
    console.warn("FastCourt: profile email lookup failed", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}

export async function defaultLibraryOwnerLookup(
  adminEmail: string,
  supabase?: SupabaseClient | null,
): Promise<string | null> {
  const client = supabase ?? createClient();
  if (!client) return null;
  return lookupProfileIdByEmail(client, adminEmail);
}

export async function readTeamLibraryOwnerFromProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("team_library_owner_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.team_library_owner_id) return null;
  return data.team_library_owner_id;
}

export async function syncTeamLibraryLink(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<string | null> {
  const membership = findOrganizationMembership(user.email);

  if (membership && organizationGrantsAppAccess(membership)) {
    const memberRole =
      membership.memberRole === "team_admin" ? "team_admin" : "coach";

    const { data, error } = await supabase.rpc("sync_team_library_link", {
      p_org_name: membership.organizationName,
      p_admin_email: membership.org.teamAdminEmail,
      p_member_role: memberRole,
    });

    if (error) {
      console.warn("FastCourt: sync team library link failed", error.message);
      return null;
    }

    return typeof data === "string" ? data : null;
  }

  const orgName = user.organizationName?.trim();
  if (!orgName) return null;

  const memberRole = user.orgMemberRole === "team_admin" ? "team_admin" : "coach";
  const adminEmail =
    memberRole === "team_admin" ? user.email.trim().toLowerCase() : null;

  const { data, error } = await supabase.rpc("sync_team_library_link", {
    p_org_name: orgName,
    p_admin_email: adminEmail,
    p_member_role: memberRole,
  });

  if (error) {
    console.warn("FastCourt: sync team library link failed", error.message);
    return null;
  }

  return typeof data === "string" ? data : null;
}

export async function resolveTeamLibraryOwnerFromCloud(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<string | null> {
  const cached = await readTeamLibraryOwnerFromProfile(supabase, user.id);
  if (cached) return cached;

  const linked = await syncTeamLibraryLink(supabase, user);
  if (linked) return linked;

  const { data, error } = await supabase.rpc("resolve_team_library_owner_id");
  if (error) {
    console.warn("FastCourt: resolve team library owner failed", error.message);
    return null;
  }
  if (!data || typeof data !== "string") return null;
  return data;
}

function organizationCoachMembership(user: SessionUser) {
  const membership = findOrganizationMembership(user.email);
  if (!membership || !organizationGrantsAppAccess(membership)) return null;
  if (membership.memberRole !== "coach") return null;
  return membership;
}

/** Profile ids for invited/active coaches in an org (for team-admin merge). */
export async function resolveOrgCoachProfileIds(
  org: TeamOrganization,
  supabase: SupabaseClient,
  excludeUserId?: string,
): Promise<string[]> {
  const emails = org.coaches
    .filter((coach) => coach.status !== "disabled")
    .map((coach) => normalizeEmail(coach.email))
    .filter(Boolean);

  const ids = new Set<string>();

  for (const email of emails) {
    const id = await lookupProfileIdByEmail(supabase, email);
    if (id && id !== excludeUserId) ids.add(id);
  }

  // Linked coaches via SECURITY DEFINER RPC (profiles RLS blocks direct selects).
  const { data: linkedIds, error: linkedError } = await supabase.rpc(
    "list_team_linked_member_ids",
  );
  if (!linkedError && Array.isArray(linkedIds)) {
    for (const id of linkedIds) {
      if (typeof id === "string" && id && id !== excludeUserId) ids.add(id);
    }
  }

  return [...ids];
}

/**
 * Team admin: mark self as shared-library owner and link roster coach profiles.
 * Required so RLS allows reading coach personal libraries for merge.
 */
export async function linkOrgCoachesToTeamLibrary(
  supabase: SupabaseClient,
  org: TeamOrganization,
): Promise<{ ok: true; ownerId: string | null } | { ok: false; error: string }> {
  const emails = org.coaches
    .filter((coach) => coach.status !== "disabled")
    .map((coach) => normalizeEmail(coach.email))
    .filter(Boolean);

  const { data, error } = await supabase.rpc("team_admin_link_member_emails", {
    p_member_emails: emails,
    p_org_name: org.name || null,
  });

  if (error) {
    // Older projects may not have the RPC yet — fall back to self link only.
    console.warn("FastCourt: team_admin_link_member_emails failed", error.message);
    const linked = await syncTeamLibraryLink(supabase, {
      id: org.teamAdminUserId || "",
      email: org.teamAdminEmail,
      displayName: org.teamAdminEmail,
      role: ROLES.teamAdmin,
      accessType: "subscription",
      expiresAt: org.expiresAt,
      organizationName: org.name,
      orgMemberRole: "team_admin",
      accessSource: "organization",
    });
    return linked
      ? { ok: true, ownerId: linked }
      : { ok: false, error: error.message };
  }

  const ownerId = typeof data === "string" ? data : null;
  if (ownerId) {
    rememberTeamAdminUserId(org.teamAdminEmail, ownerId);
  }
  return { ok: true, ownerId };
}

async function resolveOrgCoachLibraryOwnerId(
  user: SessionUser,
  adminEmail: string,
  rememberedAdminUserId: string | undefined,
  options: {
    supabase?: SupabaseClient | null;
    lookup?: LibraryOwnerLookup;
  },
): Promise<string> {
  if (isMasterAdminEmail(adminEmail)) {
    console.warn(
      "FastCourt: refusing platform-admin email as team library owner",
      adminEmail,
    );
    return user.id;
  }

  const lookup =
    options.lookup ??
    ((email: string) => defaultLibraryOwnerLookup(email, options.supabase));

  // Prefer live email → profile id (avoids stale remembered platform-admin ids).
  const adminUserId = await lookup(adminEmail);
  if (adminUserId && adminUserId !== user.id) {
    rememberTeamAdminUserId(adminEmail, adminUserId);
    return adminUserId;
  }

  if (
    rememberedAdminUserId &&
    rememberedAdminUserId !== user.id &&
    rememberedAdminUserId.trim()
  ) {
    return rememberedAdminUserId.trim();
  }

  // Same-browser localhost fallback when cloud profile lookup is unavailable.
  if (!isCloudSessionUserId(user.id)) {
    return localTeamLibraryOwnerId(adminEmail);
  }

  console.warn(
    "FastCourt: team library owner unresolved for",
    user.email,
    "— using personal library until admin link is available",
  );
  return user.id;
}

/**
 * Org coaches share the team admin library row (cloud + local demo).
 * Solo coaches keep a private library on their own account.
 */
export async function resolveLibraryCloudUserId(
  user: SessionUser,
  options: {
    supabase?: SupabaseClient | null;
    lookup?: LibraryOwnerLookup;
  } = {},
): Promise<string> {
  const client = options.supabase ?? createClient();
  const membership = findOrganizationMembership(user.email);
  const orgAccess =
    membership && organizationGrantsAppAccess(membership) ? membership : null;

  if (orgAccess?.memberRole === "team_admin") {
    rememberTeamAdminUserId(user.email, user.id);
    if (isCloudSessionUserId(user.id) && client) {
      await syncTeamLibraryLink(client, user);
    }
    return user.id;
  }

  if (orgAccess?.memberRole === "coach") {
    const adminEmail = normalizeEmail(orgAccess.org.teamAdminEmail);
    const remembered = orgAccess.org.teamAdminUserId;

    if (isCloudSessionUserId(user.id) && client) {
      const sharedOwner = await resolveTeamLibraryOwnerFromCloud(client, user);
      // sync_team_library_link returns auth.uid() when admin is missing — treat as miss.
      if (sharedOwner && sharedOwner !== user.id) {
        rememberTeamAdminUserId(adminEmail, sharedOwner);
        return sharedOwner;
      }
      return resolveOrgCoachLibraryOwnerId(user, adminEmail, remembered, {
        ...options,
        supabase: client,
      });
    }

    return resolveOrgCoachLibraryOwnerId(user, adminEmail, remembered, options);
  }

  if (isCloudSessionUserId(user.id) && client) {
    const sharedOwner = await resolveTeamLibraryOwnerFromCloud(client, user);
    if (sharedOwner && sharedOwner !== user.id) return sharedOwner;
  }

  return user.id;
}

export function isOrganizationSharedLibraryUser(user: SessionUser): boolean {
  return organizationCoachMembership(user) !== null;
}

export function usesOrganizationSharedLibrary(
  user: SessionUser,
  libraryOwnerUserId: string,
): boolean {
  // Platform admin aggregates in sync — not an org-shared row.
  if (isPlatformAdminLibraryViewer(user)) return false;
  if (user.role === ROLES.admin) return false;

  const membership = findOrganizationMembership(user.email);
  if (membership && organizationGrantsAppAccess(membership)) {
    if (membership.memberRole === "team_admin") return true;
    if (membership.memberRole === "coach") return true;
  }
  if (
    user.accessSource === "organization" &&
    (user.orgMemberRole === "team_admin" || user.orgMemberRole === "coach")
  ) {
    return true;
  }
  if (user.role === ROLES.teamAdmin && user.id !== libraryOwnerUserId) {
    return true;
  }
  return organizationCoachMembership(user) !== null;
}
