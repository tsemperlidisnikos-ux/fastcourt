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

export async function defaultLibraryOwnerLookup(
  adminEmail: string,
  supabase?: SupabaseClient | null,
): Promise<string | null> {
  const client = supabase ?? createClient();
  if (!client) return null;

  const normalized = normalizeEmail(adminEmail);
  const { data, error } = await client
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id;
}

/**
 * Cloud: always per-account library (never localStorage team org — shared browsers
 * would leak plays). Local demo: org sharing via team-organizations in localStorage.
 */
export async function resolveLibraryCloudUserId(
  user: SessionUser,
  options: {
    supabase?: SupabaseClient | null;
    lookup?: LibraryOwnerLookup;
  } = {},
): Promise<string> {
  if (isCloudSessionUserId(user.id)) {
    return user.id;
  }

  const membership = findOrganizationMembership(user.email);
  if (!membership || !organizationGrantsAppAccess(membership)) {
    return user.id;
  }

  if (membership.memberRole === "team_admin") {
    return user.id;
  }

  const adminEmail = normalizeEmail(membership.org.teamAdminEmail);
  const lookup =
    options.lookup ??
    ((email: string) => defaultLibraryOwnerLookup(email, options.supabase));

  const adminUserId = await lookup(adminEmail);
  return adminUserId ?? user.id;
}
