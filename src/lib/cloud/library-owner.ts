import {
  findOrganizationMembership,
  organizationGrantsAppAccess,
} from "@/lib/auth/org-access";
import { isCloudSessionUserId } from "@/lib/library/library-cache-policy";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/auth";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LibraryOwnerLookup = (adminEmail: string) => Promise<string | null>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
    memberRole === "team_admin"
      ? user.email.trim().toLowerCase()
      : null;

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

  if (isCloudSessionUserId(user.id) && client) {
    const sharedOwner = await resolveTeamLibraryOwnerFromCloud(client, user);
    if (sharedOwner) return sharedOwner;
    return user.id;
  }

  const membership = findOrganizationMembership(user.email);
  if (!membership || !organizationGrantsAppAccess(membership)) {
    return user.id;
  }

  if (membership.memberRole === "team_admin") {
    return user.id;
  }

  if (membership.memberRole === "coach") {
    const adminEmail = normalizeEmail(membership.org.teamAdminEmail);
    const lookup =
      options.lookup ??
      ((email: string) => defaultLibraryOwnerLookup(email, options.supabase));

    const adminUserId = await lookup(adminEmail);
    return adminUserId ?? user.id;
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
  if (user.id === libraryOwnerUserId) return false;
  if (
    isCloudSessionUserId(user.id) &&
    isCloudSessionUserId(libraryOwnerUserId)
  ) {
    return true;
  }
  const membership = organizationCoachMembership(user);
  if (!membership) return false;
  return true;
}
