import assert from "node:assert/strict";
import {
  filterPlaysForLibraryScope,
  playOwnedBySessionUser,
  usesPersonalPlayOwnership,
} from "../../src/lib/library/play-ownership";
import type { SessionUser } from "../../src/types/auth";
import type { StoredPlay } from "../../src/types/library";

function play(id: string, ownerUserId?: string, ownerEmail?: string): StoredPlay {
  return {
    id,
    title: id,
    type: "play",
    courtType: "half",
    frames: [],
    tags: [],
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    ownerUserId,
    ownerEmail,
  };
}

const soloCoach: SessionUser = {
  id: "coach-a",
  email: "a@club.com",
  displayName: "Coach A",
  role: "coach",
  accessType: "trial",
  expiresAt: null,
};

assert.equal(usesPersonalPlayOwnership(soloCoach, "coach-a"), true);
assert.equal(playOwnedBySessionUser(play("p1", "coach-a", "a@club.com"), soloCoach), true);
assert.equal(
  playOwnedBySessionUser(play("p1", "coach-a", "other@club.com"), soloCoach),
  false,
);
assert.equal(playOwnedBySessionUser(play("p1", "coach-b"), soloCoach), false);

const scoped = filterPlaysForLibraryScope(
  [
    play("mine", "coach-a", "a@club.com"),
    play("wrong-email", "coach-a", "b@club.com"),
    play("theirs", "coach-b", "b@club.com"),
    play("legacy"),
  ],
  soloCoach,
  "coach-a",
);
assert.deepEqual(
  scoped.map((p) => p.id),
  ["mine"],
);

const orgCoach: SessionUser = {
  ...soloCoach,
  id: "coach-b",
  email: "b@club.com",
  accessSource: "organization",
  orgMemberRole: "coach",
};

assert.equal(usesPersonalPlayOwnership(orgCoach, "admin-uuid"), false);
assert.deepEqual(
  filterPlaysForLibraryScope(
    [play("mine", "coach-a"), play("theirs", "coach-b")],
    orgCoach,
    "admin-uuid",
  ).map((p) => p.id),
  ["mine", "theirs"],
);

console.log("library-play-ownership.test.ts: ok");
