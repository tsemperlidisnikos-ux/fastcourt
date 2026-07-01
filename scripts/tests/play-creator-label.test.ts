import assert from "node:assert/strict";
import {
  canShowLibraryCreatedByColumn,
  resolvePlayCreatorLabel,
} from "../../src/lib/library/play-creator-label";
import type { SessionUser } from "../../src/types/auth";

const coach: SessionUser = {
  id: "coach-1",
  email: "coach@club.com",
  displayName: "Head Coach",
  role: "coach",
  accessType: "trial",
  expiresAt: null,
};

const admin: SessionUser = {
  id: "admin-1",
  email: "admin@fastcourt.eu",
  displayName: "Admin",
  role: "admin",
  accessType: "unlimited",
  expiresAt: null,
};

assert.equal(canShowLibraryCreatedByColumn(null), false);
assert.equal(canShowLibraryCreatedByColumn(coach), true);
assert.equal(canShowLibraryCreatedByColumn(admin), true);

const names = new Map([["coach-1", "Head Coach"]]);
assert.equal(
  resolvePlayCreatorLabel(
    { ownerUserId: "coach-1", ownerDisplayName: undefined },
    names,
  ),
  "Head Coach",
);
assert.equal(
  resolvePlayCreatorLabel(
    { ownerUserId: "coach-1", ownerDisplayName: "Bench Coach" },
    names,
  ),
  "Bench Coach",
);

console.log("play-creator-label.test.ts: ok");
