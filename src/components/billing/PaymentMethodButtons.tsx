"use client";

import { handlePaymentMethod } from "@/lib/billing/handle-payment";
import type { ActivePaymentMethod } from "@/types/payment-methods";

interface Props {
  methods: ActivePaymentMethod[];
  variant?: "trial" | "settings" | "default";
  emptyMessage?: string;
}

export function PaymentMethodButtons({
  methods,
  variant = "default",
  emptyMessage = "No payment methods configured. Contact your administrator.",
}: Props) {
  if (methods.length === 0) {
    return (
      <p className="fc-billing-empty" role="status">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={`fc-payment-methods fc-payment-methods--${variant}`}
      role="group"
      aria-label="Payment methods"
    >
      {methods.map((method) => (
        <button
          key={`${method.id}-${method.interval}`}
          type="button"
          className={`fc-payment-btn fc-payment-btn--${method.id}`}
          onClick={() => handlePaymentMethod(method)}
        >
          {method.label}
        </button>
      ))}
    </div>
  );
}
