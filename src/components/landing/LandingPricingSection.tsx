"use client";

import Link from "next/link";
import { useState } from "react";
import type { BillingConfig } from "@/types/billing-config";
import {
  clubMonthlyPrice,
  clubPriceBreakdown,
  formatLandingPrice,
  getLandingPricingTiers,
  individualMonthlyPrice,
  landingYearlySaveLabel,
  LANDING_PRICING_COPY,
  resolveLandingPricing,
  type LandingBillingCycle,
} from "@/lib/landing/pricing";

export function LandingPricingSection({
  billing,
}: {
  billing: Pick<BillingConfig, "landingPricing" | "defaultTrialDays" | "supportEmail">;
}) {
  const pricing = resolveLandingPricing(billing);
  const tiers = getLandingPricingTiers(billing.defaultTrialDays, billing.supportEmail);
  const [cycle, setCycle] = useState<LandingBillingCycle>("yearly");
  const coachSeats = pricing.clubCoachDefault;

  const clubBreakdown = clubPriceBreakdown(pricing, cycle, coachSeats);
  const clubMonthly = clubMonthlyPrice(pricing, cycle, coachSeats);
  const individualMonthly = individualMonthlyPrice(pricing, cycle);

  return (
    <section className="fc-landing-section fc-landing-section--pricing" id="pricing" aria-labelledby="pricing-heading">
      <div className="fc-landing-pricing-head">
        <h2 id="pricing-heading">{LANDING_PRICING_COPY.title}</h2>
        <p>{LANDING_PRICING_COPY.subtitle}</p>

        <div className="fc-landing-billing-toggle" role="group" aria-label="Billing cycle">
          <button
            type="button"
            className={`fc-landing-billing-option${cycle === "monthly" ? " is-active" : ""}`}
            aria-pressed={cycle === "monthly"}
            onClick={() => setCycle("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`fc-landing-billing-option${cycle === "yearly" ? " is-active" : ""}`}
            aria-pressed={cycle === "yearly"}
            onClick={() => setCycle("yearly")}
          >
            Yearly
            <span className="fc-landing-billing-save">{landingYearlySaveLabel(pricing)}</span>
          </button>
        </div>
      </div>

      <div className="fc-landing-pricing-grid">
        {tiers.map((tier) => {
          const isClub = tier.id === "club";
          const isFree = tier.id === "free";
          const isIndividual = tier.id === "individual";

          return (
            <article
              key={tier.id}
              className={`fc-landing-price-card fc-landing-price-card--${tier.accent}${tier.popular ? " is-popular" : ""}`}
            >
              {tier.popular ? (
                <span className="fc-landing-price-popular">Most Popular</span>
              ) : null}

              <h3>{tier.name}</h3>

              {isFree ? (
                <>
                  <p className="fc-landing-price-amount">
                    <span className="fc-landing-price-value">0€</span>
                    <span className="fc-landing-price-period">/ month</span>
                  </p>
                  <p className="fc-landing-price-billed">Start with a free trial account</p>
                </>
              ) : isIndividual ? (
                <>
                  <p className="fc-landing-price-amount">
                    <span className="fc-landing-price-value">
                      {formatLandingPrice(individualMonthly)}
                    </span>
                    <span className="fc-landing-price-period">/ month</span>
                  </p>
                  <p className="fc-landing-price-billed">
                    {cycle === "yearly" ? "billed yearly" : "billed monthly"}
                  </p>
                </>
              ) : (
                <>
                  <p className="fc-landing-price-amount">
                    <span className="fc-landing-price-value">{formatLandingPrice(clubMonthly)}</span>
                    <span className="fc-landing-price-period">/ month</span>
                  </p>
                  <p className="fc-landing-price-billed">
                    {cycle === "yearly" ? "billed yearly" : "billed monthly"}
                  </p>
                  <p className="fc-landing-price-breakdown">
                    {clubBreakdown.adminLabel} + {clubBreakdown.coachesLabel}
                  </p>
                </>
              )}

              {tier.includesIndividualNote ? (
                <p className="fc-landing-price-includes">{tier.includesIndividualNote}</p>
              ) : null}

              <ul className="fc-landing-price-features">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              {tier.href.startsWith("mailto:") ? (
                <a
                  href={tier.href}
                  className={`fc-landing-price-cta fc-landing-price-cta--${tier.accent}`}
                >
                  {tier.cta}
                </a>
              ) : (
                <Link
                  href={tier.href}
                  className={`fc-landing-price-cta fc-landing-price-cta--${tier.accent}`}
                >
                  {tier.cta}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
