import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  acceptTeamInvite,
  applyOrganizationAccess,
  findOrganizationMembership,
  isOrganizationSubscriptionActive,
} from "../../src/lib/auth/org-access.ts";
import {
  loadTeamOrganizations,
  newOrgMember,
  newOrganization,
  saveTeamOrganizations,
} from "../../src/lib/auth/team-organizations.ts";
import type { SessionUser } from "../../src/types/auth.ts";
import { ROLES } from "../../src/lib/config.ts";

const STORAGE_KEY = "fastcourt_team_orgs_v1";

function baseUser(email: string): SessionUser {
  return {
    id: `user-${email}`,
    email,
    displayName: "Coach",
    role: ROLES.coach,
    accessType: "trial",
    expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
  };
}

describe("team org access", () => {
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
      newOrgMember("coach@athensbc.gr", "coach", { invited: true }),
    ];
    saveTeamOrganizations([org]);
  });

  afterEach(() => {
    if (previous === null) globalThis.localStorage.removeItem(STORAGE_KEY);
    else globalThis.localStorage.setItem(STORAGE_KEY, previous);
  });

  it("accepts a coach invite and activates membership", () => {
    const org = loadTeamOrganizations()[0]!;
    const coach = org.coaches[0]!;
    const result = acceptTeamInvite(
      {
        token: coach.inviteToken!,
        email: coach.email,
        memberRole: "coach",
        organizationId: org.id,
        memberId: coach.id,
      },
      coach.email,
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const refreshed = loadTeamOrganizations()[0]!;
    assert.equal(refreshed.coaches[0]?.status, "active");
    assert.equal(refreshed.coaches[0]?.inviteToken, undefined);
  });

  it("grants subscription access through an active organization", () => {
    const org = loadTeamOrganizations()[0]!;
    acceptTeamInvite(
      {
        token: org.coaches[0]!.inviteToken!,
        email: "coach@athensbc.gr",
        memberRole: "coach",
        organizationId: org.id,
        memberId: org.coaches[0]!.id,
      },
      "coach@athensbc.gr",
    );

    const membership = findOrganizationMembership("coach@athensbc.gr");
    assert.ok(membership);
    assert.equal(isOrganizationSubscriptionActive(membership!.org), true);

    const enriched = applyOrganizationAccess(baseUser("coach@athensbc.gr"));
    assert.equal(enriched.accessType, "subscription");
    assert.equal(enriched.accessSource, "organization");
    assert.equal(enriched.organizationName, "Athens BC");
  });

  it("rejects invite when email does not match", () => {
    const org = loadTeamOrganizations()[0]!;
    const coach = org.coaches[0]!;
    const result = acceptTeamInvite(
      {
        token: coach.inviteToken!,
        email: coach.email,
        memberRole: "coach",
        organizationId: org.id,
        memberId: coach.id,
      },
      "other@example.com",
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /different email/i);
  });

  it("rejects invite when token does not match", () => {
    const org = loadTeamOrganizations()[0]!;
    const coach = org.coaches[0]!;
    const result = acceptTeamInvite(
      {
        token: "deadbeef",
        email: coach.email,
        memberRole: "coach",
        organizationId: org.id,
        memberId: coach.id,
      },
      coach.email,
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.reason, /expired/i);
  });
});
