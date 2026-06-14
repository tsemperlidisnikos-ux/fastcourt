import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROLES } from "../../src/lib/config.ts";
import {
  partitionOrganizationsForPurge,
  partitionPlaysForPurge,
  playShouldBeRemoved,
} from "../../src/lib/admin/purge-application-data.ts";
import type { AdminUserRecord } from "../../src/types/admin-user.ts";
import type { StoredPlay } from "../../src/types/library.ts";

const admin: AdminUserRecord = {
  id: "admin-1",
  email: "admin@fastcourt.app",
  displayName: "Administrator",
  role: ROLES.admin,
  accessType: "unlimited",
  expiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  signupComplete: true,
};

const coach: AdminUserRecord = {
  id: "coach-1",
  email: "coach@example.com",
  displayName: "Coach One",
  role: ROLES.coach,
  accessType: "trial",
  expiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  organization: "Promitheas Patras BC",
  signupComplete: true,
};

function play(team: string, title = "Play"): StoredPlay {
  return {
    id: `play-${team}`,
    title,
    type: "play",
    tags: [],
    frames: [],
    courtType: "half",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    team,
  };
}

describe("purge application data", () => {
  it("playShouldBeRemoved flags coach-owned plays only", () => {
    assert.equal(playShouldBeRemoved(play("Promitheas Patras BC"), admin, [coach]), true);
    assert.equal(playShouldBeRemoved(play("Personal Team"), admin, [coach]), false);
  });

  it("partitionPlaysForPurge keeps unmatched plays for admin library", () => {
    const result = partitionPlaysForPurge(
      [play("Promitheas Patras BC"), play("Admin Club")],
      admin,
      [coach],
    );
    assert.equal(result.removed.length, 1);
    assert.equal(result.kept.length, 1);
    assert.equal(result.kept[0]?.team, "Admin Club");
  });

  it("partitionOrganizationsForPurge keeps admin-owned orgs", () => {
    const result = partitionOrganizationsForPurge(
      [
        {
          id: "org-1",
          name: "Admin Club",
          teamAdminEmail: "admin@fastcourt.app",
          coachSeats: 5,
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          coaches: [],
          players: [],
        },
        {
          id: "org-2",
          name: "Other Club",
          teamAdminEmail: "other@example.com",
          coachSeats: 5,
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          coaches: [],
          players: [],
        },
      ],
      admin.email,
    );
    assert.equal(result.kept.length, 1);
    assert.equal(result.removed.length, 1);
    assert.equal(result.kept[0]?.name, "Admin Club");
  });
});
