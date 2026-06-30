import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_BILLING_CONFIG,
  normalizeBillingConfig,
  normalizeLandingPricing,
} from "../../src/lib/settings/billing-config.ts";
import {
  clubMonthlyPrice,
  individualMonthlyPrice,
} from "../../src/lib/landing/pricing.ts";

describe("landing pricing config", () => {
  it("normalizes landing pricing numbers and coach slider bounds", () => {
    const pricing = normalizeLandingPricing({
      individualYearlyEur: 120,
      individualMonthlyEur: 12,
      clubAdminYearlyEur: 99,
      clubCoachSeatYearlyEur: 40,
      clubCoachSeatMonthlyEur: 4,
      yearlySavePercent: 20,
      clubCoachMin: 2,
      clubCoachMax: 15,
      clubCoachDefault: 8,
    });

    assert.equal(pricing.individualYearlyEur, 120);
    assert.equal(pricing.yearlySavePercent, 20);
    assert.equal(pricing.clubCoachMin, 2);
    assert.equal(pricing.clubCoachMax, 15);
    assert.equal(pricing.clubCoachDefault, 8);
    assert.equal(individualMonthlyPrice(pricing, "yearly"), 10);
    assert.equal(clubMonthlyPrice(pricing, "yearly", 8), (99 + 8 * 40) / 12);
  });

  it("adds default landing pricing to legacy billing config", () => {
    const config = normalizeBillingConfig({
      supportEmail: "admin@fastcourt.eu",
      defaultTrialDays: 7,
    });

    assert.ok(config.landingPricing);
    assert.equal(config.landingPricing.individualYearlyEur, 99);
    assert.match(
      config.plans.find((plan) => plan.id === "annual")?.priceLabel ?? "",
      /€99/,
    );
  });

  it("syncs annual plan label when yearly price changes", () => {
    const config = normalizeBillingConfig({
      ...DEFAULT_BILLING_CONFIG,
      landingPricing: {
        ...DEFAULT_BILLING_CONFIG.landingPricing,
        individualYearlyEur: 149,
      },
    });

    assert.equal(
      config.plans.find((plan) => plan.id === "annual")?.priceLabel,
      "€149 / year",
    );
  });
});
