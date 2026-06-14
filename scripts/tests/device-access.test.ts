import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  checkDeviceLimit,
  getOrCreateDeviceId,
} from "../../src/lib/auth/device-access.ts";
import type { SessionUser } from "../../src/types/auth.ts";
import { ROLES } from "../../src/lib/config.ts";

function coachUser(): SessionUser {
  return {
    id: "coach-1",
    email: "coach@test.com",
    displayName: "Coach",
    role: ROLES.coach,
    accessType: "trial",
    expiresAt: null,
  };
}

describe("device access", () => {
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
    previous = localStorage.getItem("fastcourt_device_id_v1");
    localStorage.removeItem("fastcourt_device_id_v1");
  });

  afterEach(() => {
    if (previous) localStorage.setItem("fastcourt_device_id_v1", previous);
    else localStorage.removeItem("fastcourt_device_id_v1");
  });

  it("creates a stable device id", () => {
    const a = getOrCreateDeviceId();
    const b = getOrCreateDeviceId();
    assert.equal(a, b);
    assert.ok(a.length > 0);
  });

  it("blocks new device when limit reached", () => {
    getOrCreateDeviceId();
    const error = checkDeviceLimit(coachUser(), [
      { id: "other-1", label: "iPad", lastSeenAt: new Date().toISOString() },
      { id: "other-2", label: "Mac", lastSeenAt: new Date().toISOString() },
    ]);
    assert.ok(error);
    assert.match(error!, /2 device/i);
  });
});
