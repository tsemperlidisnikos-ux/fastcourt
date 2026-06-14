import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessFromStripeSubscription,
  mergeSubscriptionExpiry,
  stripePeriodEndToIso,
  subscriptionPeriodEndUnix,
} from "../../src/lib/billing/stripe-access.ts";

describe("stripe access helpers", () => {
  it("converts unix period end to ISO", () => {
    const iso = stripePeriodEndToIso(1_700_000_000);
    assert.equal(iso, new Date(1_700_000_000 * 1000).toISOString());
  });

  it("never shortens existing expiry when merging period end", () => {
    const current = "2030-01-01T00:00:00.000Z";
    const merged = mergeSubscriptionExpiry(current, 1_700_000_000);
    assert.equal(merged, current);
  });

  it("extends expiry from period end when later than current", () => {
    const current = "2020-01-01T00:00:00.000Z";
    const periodEnd = 1_900_000_000;
    const merged = mergeSubscriptionExpiry(current, periodEnd);
    assert.equal(merged, stripePeriodEndToIso(periodEnd));
  });

  it("maps active subscription to subscription access", () => {
    const future = Math.floor(Date.now() / 1000) + 86_400;
    const access = accessFromStripeSubscription("active", future, null);
    assert.equal(access.accessType, "subscription");
    assert.equal(access.active, true);
    assert.ok(access.expiresAt);
  });

  it("reads period end from subscription items", () => {
    const end = subscriptionPeriodEndUnix({
      items: {
        data: [{ current_period_end: 1_800_000_000 }, { current_period_end: 1_900_000_000 }],
      },
    });
    assert.equal(end, 1_900_000_000);
  });

  it("keeps access until period end when canceled", () => {
    const future = Math.floor(Date.now() / 1000) + 86_400;
    const access = accessFromStripeSubscription("canceled", future, null);
    assert.equal(access.accessType, "subscription");
    assert.equal(access.active, false);
  });

  it("marks unpaid without period end as inactive", () => {
    const past = "2020-01-01T00:00:00.000Z";
    const access = accessFromStripeSubscription("unpaid", null, past);
    assert.equal(access.accessType, "trial");
    assert.equal(access.active, false);
  });
});
