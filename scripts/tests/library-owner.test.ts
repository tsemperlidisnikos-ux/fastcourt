import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  resolveLibraryCloudUserId,
  usesOrganizationSharedLibrary,
} from "../../src/lib/cloud/library-owner.ts";
import {
  newOrgMember,
  newOrganization,
  saveTeamOrganizations,
} from "../../src/lib/auth/team-organizations.ts";
import { usesPersonalPlayOwnership } from "../../src/lib/library/play-ownership.ts";
import type { SessionUser } from "../../src/types/auth.ts";
import { ROLES } from "../../src/lib/config.ts";

const STORAGE_KEY = "fastcourt_team_orgs_v1";

function coachUser(id: string, email: string): SessionUser {
  return {
    id,
    email,
    displayName: "Coach",
    role: ROLES.coach,
    accessType: "subscription",
    expiresAt: null,
    accessSource: "organization",
    organizationName: "Athens BC",
    orgMemberRole: "coach",
  };
}

describe("library owner resolution", () => {
  let previous: string | null = null;

  beforeEach(() => {
    if (typeof globalThis.localStorage === "undefined") {
      const store = new Map<string, string>();
      Object.defineProperty(globalThis, "localStorage", {
        value: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => {
            store.set(key, value);
          },
          removeItem: (key: string) => {
            store.delete(key);
          },
        },
        configurable: true,
      });
    }

    previous = globalThis.localStorage.getItem(STORAGE_KEY);
    const org = newOrganization({
      name: "Athens BC",
      teamAdminEmail: "admin@athensbc.gr",
      coachSeats: 3,
      expiresAt: null,
    });
    org.coaches = [
      newOrgMember("coach@athensbc.gr", "coach", { invited: false }),
    ];
    org.coaches[0]!.status = "active";
    saveTeamOrganizations([org]);
  });

  afterEach(() => {
    if (previous === null) globalThis.localStorage.removeItem(STORAGE_KEY);
    else globalThis.localStorage.setItem(STORAGE_KEY, previous);
  });

  it("org coach resolves to the team admin cloud library row", async () => {
    const ownerId = await resolveLibraryCloudUserId(
      coachUser("coach-uuid", "coach@athensbc.gr"),
      {
        lookup: async (email) =>
          email === "admin@athensbc.gr" ? "admin-uuid" : null,
      },
    );
    assert.equal(ownerId, "admin-uuid");
  });

  it("local org coach resolves to local team admin library scope", async () => {
    const ownerId = await resolveLibraryCloudUserId(
      coachUser("local-coach@athensbc.gr", "coach@athensbc.gr"),
      {
        lookup: async () => null,
        supabase: null,
      },
    );
    assert.equal(ownerId, "local-admin@athensbc.gr");
    assert.equal(
      usesOrganizationSharedLibrary(
        coachUser("local-coach@athensbc.gr", "coach@athensbc.gr"),
        ownerId,
      ),
      true,
    );
  });

  it("cloud org coach prefers shared owner rpc", async () => {
    const user = coachUser(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "coach@athensbc.gr",
    );
    const ownerId = await resolveLibraryCloudUserId(user, {
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        rpc: async (name: string) => {
          if (name === "sync_team_library_link") {
            return { data: "admin-uuid", error: null };
          }
          if (name === "resolve_team_library_owner_id") {
            return { data: "admin-uuid", error: null };
          }
          return { data: null, error: null };
        },
      } as never,
    });
    assert.equal(ownerId, "admin-uuid");
  });

  it("solo cloud coach keeps a private library row", async () => {
    const ownerId = await resolveLibraryCloudUserId(
      coachUser("solo-uuid", "solo@club.com"),
      {
        lookup: async () => "admin-uuid",
      },
    );
    assert.equal(ownerId, "solo-uuid");
  });

  it("cloud team admin sync passes admin email from session", async () => {
    const user: SessionUser = {
      id: "admin-uuid-1111-2222-3333-444455556666",
      email: "admin@athensbc.gr",
      displayName: "Admin",
      role: ROLES.teamAdmin,
      accessType: "subscription",
      expiresAt: null,
      accessSource: "organization",
      organizationName: "Athens BC",
      orgMemberRole: "team_admin",
    };

    let adminEmailArg: string | null = null;
    const ownerId = await resolveLibraryCloudUserId(user, {
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
        rpc: async (name: string, args: Record<string, unknown>) => {
          if (name === "sync_team_library_link") {
            adminEmailArg = String(args.p_admin_email ?? "");
            return { data: "admin-uuid-1111-2222-3333-444455556666", error: null };
          }
          if (name === "resolve_team_library_owner_id") {
            return { data: "admin-uuid-1111-2222-3333-444455556666", error: null };
          }
          return { data: null, error: null };
        },
      } as never,
    });

    assert.equal(ownerId, "admin-uuid-1111-2222-3333-444455556666");
    assert.equal(adminEmailArg, "admin@athensbc.gr");
  });

  it("cloud org coach uses email lookup when sync returns self id", async () => {
    const user = coachUser(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "coach@athensbc.gr",
    );
    const ownerId = await resolveLibraryCloudUserId(user, {
      lookup: async (email) =>
        email === "admin@athensbc.gr" ? "admin-uuid-1111-2222-3333-444455556666" : null,
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { team_library_owner_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
                error: null,
              }),
            }),
          }),
        }),
        rpc: async () => ({
          data: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          error: null,
        }),
      } as never,
    });
    assert.equal(ownerId, "admin-uuid-1111-2222-3333-444455556666");
  });

  it("cloud org coach uses remembered teamAdminUserId", async () => {
    const orgs = JSON.parse(
      globalThis.localStorage.getItem(STORAGE_KEY) || "[]",
    ) as Array<{ teamAdminUserId?: string }>;
    orgs[0]!.teamAdminUserId = "remembered-admin-uuid";
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(orgs));

    const ownerId = await resolveLibraryCloudUserId(
      coachUser("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "coach@athensbc.gr"),
      {
        lookup: async () => null,
        supabase: {
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          rpc: async () => ({ data: null, error: null }),
        } as never,
      },
    );
    assert.equal(ownerId, "remembered-admin-uuid");
  });

  it("org coach does not use personal play ownership on the shared row", () => {
    const user = coachUser("coach-uuid", "coach@athensbc.gr");
    assert.equal(usesOrganizationSharedLibrary(user, "admin-uuid"), true);
    assert.equal(usesPersonalPlayOwnership(user, "admin-uuid"), false);
    assert.equal(usesPersonalPlayOwnership(user, "coach-uuid"), false);
  });

  it("local team admin sees full shared library without owner filter", () => {
    const admin: SessionUser = {
      id: "local-admin@athensbc.gr",
      email: "admin@athensbc.gr",
      displayName: "Admin",
      role: ROLES.teamAdmin,
      accessType: "subscription",
      expiresAt: null,
      accessSource: "organization",
      organizationName: "Athens BC",
      orgMemberRole: "team_admin",
    };
    assert.equal(
      usesPersonalPlayOwnership(admin, "local-admin@athensbc.gr"),
      false,
    );
    assert.equal(
      usesOrganizationSharedLibrary(admin, "local-admin@athensbc.gr"),
      true,
    );
  });

  it("team admin with only role flag still sees full shared library", () => {
    const admin: SessionUser = {
      id: "admin-uuid",
      email: "admin@athensbc.gr",
      displayName: "Admin",
      role: ROLES.teamAdmin,
      accessType: "subscription",
      expiresAt: null,
    };
    assert.equal(usesPersonalPlayOwnership(admin, "admin-uuid"), false);
  });
});
