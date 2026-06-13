import type { PaymentMethodsConfig } from "@/types/payment-methods";

export interface BillingPlan {
  id: string;
  label: string;
  priceLabel: string;
  trialDays: number;
  active: boolean;
}

export interface BillingConfig {
  supportEmail: string;
  defaultTrialDays: number;
  /** @deprecated Use methods.stripe — kept for migration */
  monthlyPaymentUrl: string;
  /** @deprecated Use methods.stripe — kept for migration */
  annualPaymentUrl: string;
  methods: PaymentMethodsConfig;
  deviceLimitPerCoach: number;
  plans: BillingPlan[];
}
