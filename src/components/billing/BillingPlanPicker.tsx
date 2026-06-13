"use client";

import type { SubscriptionPlanView } from "@/lib/billing/subscription-ui";

interface Props {
  plans: SubscriptionPlanView[];
  value: string;
  onChange: (planId: string) => void;
}

export function BillingPlanPicker({ plans, value, onChange }: Props) {
  if (plans.length <= 1) return null;

  return (
    <div className="fc-billing-plan-picker" role="radiogroup" aria-label="Billing plan">
      {plans.map((plan) => (
        <label
          key={plan.id}
          className={`fc-billing-plan-option${value === plan.id ? " is-selected" : ""}`}
        >
          <input
            type="radio"
            name="billing-plan"
            value={plan.id}
            checked={value === plan.id}
            onChange={() => onChange(plan.id)}
          />
          <span className="fc-billing-plan-label">{plan.label}</span>
          {plan.priceLabel ? (
            <span className="fc-billing-plan-price">{plan.priceLabel}</span>
          ) : null}
        </label>
      ))}
    </div>
  );
}
