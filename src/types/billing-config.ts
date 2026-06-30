import type { PaymentMethodsConfig } from "@/types/payment-methods";

export interface LandingPricingConfig {
  individualYearlyEur: number;
  individualMonthlyEur: number;
  clubAdminYearlyEur: number;
  clubCoachSeatYearlyEur: number;
  clubCoachSeatMonthlyEur: number;
  yearlySavePercent: number;
  clubCoachMin: number;
  clubCoachMax: number;
  clubCoachDefault: number;
}

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
  landingPricing: LandingPricingConfig;
}
