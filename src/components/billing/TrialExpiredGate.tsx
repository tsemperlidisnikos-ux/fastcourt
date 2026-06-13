"use client";

import { useMemo, useState } from "react";
import { redeemLicenseKey } from "@/lib/auth/license";
import { hasFullAccess } from "@/lib/auth/roles";
import { isTrialExpired } from "@/lib/billing/subscription-ui";
import { BillingPlanPicker } from "@/components/billing/BillingPlanPicker";
import { LicenseKeyRow } from "@/components/billing/LicenseKeyRow";
import { PaymentMethodButtons } from "@/components/billing/PaymentMethodButtons";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  getSubscriptionPlans,
  type BillingInterval,
} from "@/lib/billing/subscription-ui";
import "@/styles/billing-ui.css";

export function TrialExpiredGate() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);
  const billing = useSettingsStore((s) => s.billing);
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const [planId, setPlanId] = useState("annual");

  const blocked = useMemo(() => {
    if (!session?.user) return false;
    if (hasFullAccess(session.user)) return false;
    return isTrialExpired(session.user);
  }, [session?.user]);

  const plans = useMemo(() => getSubscriptionPlans(billing), [billing]);
  const activePlan = plans.find((p) => p.id === planId) ?? plans[0];
  const methods =
    activePlan?.methods.filter((m) => m.interval === interval) ??
    activePlan?.methods ??
    [];

  if (!blocked || !session) return null;

  return (
    <div className="fc-trial-expired-gate welcome-expired-mode" id="welcome-expired-mode">
      <div className="fc-trial-expired-card org-settings-box">
        <h1 className="fc-trial-expired-title">Your trial has ended</h1>
        <p className="fc-trial-expired-copy">
          Subscribe to keep using FastCourt, or apply a license key from your
          organization.
        </p>

        {plans.length > 1 ? (
          <div className="fc-trial-interval-toggle" role="tablist" aria-label="Billing interval">
            <button
              type="button"
              className={interval === "annual" ? "is-active" : ""}
              onClick={() => setInterval("annual")}
            >
              Annual
            </button>
            <button
              type="button"
              className={interval === "monthly" ? "is-active" : ""}
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </button>
          </div>
        ) : null}

        <BillingPlanPicker plans={plans} value={planId} onChange={setPlanId} />
        <PaymentMethodButtons methods={methods} variant="trial" />

        <LicenseKeyRow
          onRedeem={async (code) => {
            const result = await redeemLicenseKey(code);
            if (!result.ok) return result.error;
            setSession(result.session);
            return null;
          }}
        />

        {billing.supportEmail ? (
          <p className="fc-trial-banner-support">
            Need help?{" "}
            <a href={`mailto:${billing.supportEmail}`}>{billing.supportEmail}</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
