import { loadAdminUsers } from "@/lib/auth/admin-users";
import { fetchCloudAdminUsers } from "@/lib/auth/profiles-cloud";
import { findOrganizationMembership } from "@/lib/auth/org-access";
import { isAdminUser } from "@/lib/auth/roles";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/auth";
import type { LibraryItem } from "@/types/library";

/** Show for all signed-in coaches (solo, team admin, platform admin). */
export function canShowLibraryCreatedByColumn(user: SessionUser | null | undefined) {
  return !!user;
}

export function resolvePlayCreatorLabel(
  item: Pick<LibraryItem, "ownerUserId" | "ownerDisplayName">,
  namesByUserId: ReadonlyMap<string, string>,
): string {
  if (item.ownerDisplayName?.trim()) return item.ownerDisplayName.trim();
  if (item.ownerUserId) {
    const resolved = namesByUserId.get(item.ownerUserId);
    if (resolved) return resolved;
  }
  return "—";
}

export function buildLocalCreatorNameIndex(): Map<string, string> {
  const map = new Map<string, string>();
  for (const user of loadAdminUsers()) {
    map.set(user.id, user.displayName?.trim() || user.email);
  }
  return map;
}

export async function loadCreatorNameIndex(
  sessionUser: SessionUser | null | undefined,
): Promise<Map<string, string>> {
  const map = buildLocalCreatorNameIndex();
  if (!sessionUser) return map;

  map.set(
    sessionUser.id,
    sessionUser.displayName?.trim() || sessionUser.email,
  );

  if (!isCloudEnabled()) return map;

  const supabase = createClient();
  if (!supabase) return map;

  if (isAdminUser(sessionUser)) {
    const result = await fetchCloudAdminUsers(supabase);
    if (result.ok) {
      for (const user of result.users) {
        map.set(user.id, user.displayName?.trim() || user.email);
      }
    }
    return map;
  }

  const orgName =
    sessionUser.organizationName?.trim() ||
    findOrganizationMembership(sessionUser.email)?.organizationName.trim() ||
    "";
  if (!orgName) return map;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .ilike("organization", orgName);

  if (!error && data) {
    for (const row of data) {
      const id = String(row.id);
      map.set(id, String(row.display_name || row.email || "").trim() || String(row.email));
    }
  }

  return map;
}
