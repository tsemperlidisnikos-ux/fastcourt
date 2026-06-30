import assert from "node:assert/strict";
import {
  shouldClearUntrustedLocalLibrary,
  shouldResetLibraryCache,
} from "../../src/lib/library/library-cache-policy";

assert.equal(
  shouldResetLibraryCache("user-a", "owner-a", "user-b", "owner-a"),
  true,
  "session user change clears cache",
);

assert.equal(
  shouldResetLibraryCache("user-a", "owner-a", "user-a", "owner-b"),
  true,
  "library owner change clears cache",
);

assert.equal(
  shouldResetLibraryCache("user-a", "owner-a", "user-a", "owner-a"),
  false,
  "same session and owner keeps cache",
);

assert.equal(
  shouldResetLibraryCache(null, null, "user-a", "owner-a"),
  false,
  "first login does not force reset",
);

assert.equal(
  shouldClearUntrustedLocalLibrary(null, "cloud-user-uuid", 3),
  true,
  "cloud login with orphan local plays clears cache",
);

assert.equal(
  shouldClearUntrustedLocalLibrary("cloud-user-uuid", "cloud-user-uuid", 3),
  false,
  "same cloud user keeps local plays",
);

console.log("library-user-isolation.test.ts: ok");
