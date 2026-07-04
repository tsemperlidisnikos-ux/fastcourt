import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySafeNextPath,
  isLoginSignedOut,
  isPasswordRecoveryLogin,
  loginSignedOutUrl,
  PASSWORD_RECOVERY_LOGIN_PATH,
  safeNextPath,
} from "../../src/lib/auth/safe-next-path.ts";

describe("safe-next-path", () => {
  it("blocks protocol-relative redirects", () => {
    assert.equal(safeNextPath("//evil.example"), "/library");
  });

  it("allows login recovery route", () => {
    assert.equal(safeNextPath(PASSWORD_RECOVERY_LOGIN_PATH), PASSWORD_RECOVERY_LOGIN_PATH);
  });

  it("detects password recovery login screen", () => {
    assert.equal(isPasswordRecoveryLogin("/login", "1"), true);
    assert.equal(isPasswordRecoveryLogin("/login", null), false);
    assert.equal(isPasswordRecoveryLogin("/library", "1"), false);
  });

  it("preserves query string when applying next redirect", () => {
    const url = new URL("https://fastcourt.test/login?next=%2Flibrary");
    applySafeNextPath(url, "/library?welcome=1");
    assert.equal(url.pathname, "/library");
    assert.equal(url.search, "?welcome=1");
  });

  it("builds signed-out login url and detects the flag", () => {
    assert.equal(loginSignedOutUrl(), "/login?signed_out=1");
    assert.equal(loginSignedOutUrl("/library"), "/login?signed_out=1&next=%2Flibrary");
    const params = new URLSearchParams("signed_out=1");
    assert.equal(isLoginSignedOut(params), true);
    assert.equal(isLoginSignedOut(new URLSearchParams()), false);
  });
});
