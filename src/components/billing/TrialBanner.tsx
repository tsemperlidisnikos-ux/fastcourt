"use client";

import { useMemo, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import {
  formatTrialAccessMessage,
  getSubscriptionPlans,
  isTrialExpired,
  isTrialWarning,
  shouldShowTrialBanner,
  type BillingInterval,
} from "@/lib/billing/subscription-ui";
import { BillingPlanPicker } from "@/components/billing/BillingPlanPicker";
import { PaymentMethodButtons } from "@/components/billing/PaymentMethodButtons";
import type { SessionUser } from "@/types/auth";

interface Props {
  user: SessionUser;
}

export function TrialBanner({ user }: Props) {
  const billing = useSettingsStore((s) => s.billing);
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [planId, setPlanId] = useState("annual");

  const plans = useMemo(() => getSubscriptionPlans(billing), [billing]);
  const activePlan = plans.find((p) => p.id === planId) ?? plans[0];
  const methods = activePlan?.methods.filter((m) => m.interval === interval) ?? activePlan?.methods ?? [];

  if (!shouldShowTrialBanner(user)) return null;

  const warn = isTrialWarning(user);
  const expired = isTrialExpired(user);

  return (
    <aside
      className={`org-trial-banner fc-trial-banner${warn || expired ? " org-trial-banner-warn" : ""}`}
      id="org-trial-banner"
      aria-live="polite"
    >
      <div className="fc-trial-banner-inner">
        <div className="fc-trial-banner-copy">
          <p className="fc-trial-banner-headline">
            <strong className="fc-trial-banner-title">
              {expired ? "Trial ended" : "Trial access"}
            </strong>
            <span className="fc-trial-banner-sep" aria-hidden="true">
              ·
            </span>
            <span className="fc-trial-banner-message">
              {formatTrialAccessMessage(user)}
            </span>
            {billing.supportEmail ? (
              <>
                <span className="fc-trial-banner-sep" aria-hidden="true">
                  ·
                </span>
                <span className="fc-trial-banner-support-inline">
                  Questions?{" "}
                  <a href={`mailto:${billing.supportEmail}`}>
                    {billing.supportEmail}
                  </a>
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="fc-trial-banner-actions">
          {plans.length > 1 ? (
            <div className="fc-trial-interval-toggle" role="tablist" aria-label="Billing interval">
              <button
                type="button"
                role="tab"
                aria-selected={interval === "annual"}
                className={interval === "annual" ? "is-active" : ""}
                onClick={() => setInterval("annual")}
              >
                Annual
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={interval === "monthly"}
                className={interval === "monthly" ? "is-active" : ""}
                onClick={() => setInterval("monthly")}
              >
                Monthly
              </button>
            </div>
          ) : null}
          <BillingPlanPicker plans={plans} value={planId} onChange={setPlanId} />
          <PaymentMethodButtons methods={methods} variant="trial" />
        </div>
      </div>
    </aside>
  );
}
