import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTeamInviteUrl,
  decodeInvitePayload,
  encodeInvitePayload,
  type PendingTeamInvite,
} from "../../src/lib/auth/team-invite.ts";

const invite: PendingTeamInvite = {
  token: "abc123def456",
  email: "coach@athensbc.gr",
  memberRole: "coach",
  organizationName: "Athens BC",
  organizationId: "org-1",
  memberId: "member-1",
  status: "invited",
  teamAdminEmail: "admin@athensbc.gr",
  coachSeats: 5,
  expiresAt: null,
};

describe("team invite payload", () => {
  it("round-trips invite payload encoding", () => {
    const encoded = encodeInvitePayload(invite);
    const decoded = decodeInvitePayload(encoded);
    assert.ok(decoded);
    assert.equal(decoded!.email, "coach@athensbc.gr");
    assert.equal(decoded!.teamAdminEmail, "admin@athensbc.gr");
    assert.equal(decoded!.organizationId, "org-1");
    assert.equal(decoded!.token, "abc123def456");
  });

  it("embeds payload in invite URL", () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        location: {
          pathname: "/login",
          origin: "http://localhost:3000",
        },
      },
      configurable: true,
    });
    try {
      const url = buildTeamInviteUrl(invite);
      assert.match(url, /^http:\/\/localhost:3000\/login#team-invite=abc123def456&d=/);
      const payload = url.split("&d=")[1]!;
      const decoded = decodeInvitePayload(payload);
      assert.equal(decoded?.organizationName, "Athens BC");
    } finally {
      if (previous === undefined) {
        // @ts-expect-error cleanup test shim
        delete globalThis.window;
      } else {
        Object.defineProperty(globalThis, "window", {
          value: previous,
          configurable: true,
        });
      }
    }
  });
});
