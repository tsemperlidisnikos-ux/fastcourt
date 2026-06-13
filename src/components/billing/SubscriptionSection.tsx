"use client";

import { useMemo, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import {
  formatTrialAccessMessage,
  getSubscriptionPlans,
  type BillingInterval,
} from "@/lib/billing/subscription-ui";
import { BillingPlanPicker } from "@/components/billing/BillingPlanPicker";
import { LicenseKeyRow } from "@/components/billing/LicenseKeyRow";
import { PaymentMethodButtons } from "@/components/billing/PaymentMethodButtons";
import { redeemLicenseKey } from "@/lib/auth/license";
import { useAuthStore } from "@/stores/auth-store";
import type { SessionUser } from "@/types/auth";

interface Props {
  user: SessionUser;
}

export function SubscriptionSection({ user }: Props) {
  const setSession = useAuthStore((s) => s.setSession);
  const billing = useSettingsStore((s) => s.billing);
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [planId, setPlanId] = useState("annual");

  const plans = useMemo(() => getSubscriptionPlans(billing), [billing]);
  const activePlan = plans.find((p) => p.id === planId) ?? plans[0];
  const methods =
    activePlan?.methods.filter((m) => m.interval === interval) ?? activePlan?.methods ?? [];

  return (
    <section className="fc-subscription-section" id="org-settings-subscription">
      <h3 className="fc-subscription-heading">Subscription</h3>
      <p className="fc-subscription-status">{formatTrialAccessMessage(user)}</p>
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
      <PaymentMethodButtons methods={methods} variant="settings" />
      <LicenseKeyRow
        onRedeem={async (code) => {
          const result = await redeemLicenseKey(code);
          if (!result.ok) return result.error;
          setSession(result.session);
          return null;
        }}
      />
    </section>
  );
}
