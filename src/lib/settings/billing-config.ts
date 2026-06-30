import {
  getDefaultPaymentMethods,
  normalizePaymentMethods,
} from "@/lib/settings/payment-methods";
import { ADMIN_EMAIL, DEFAULT_TRIAL_DAYS } from "@/lib/config";
import type { BillingConfig, LandingPricingConfig } from "@/types/billing-config";

const STORAGE_KEY = "fastcourt_billing_config_v1";
const LEGACY_STORAGE_KEY = "playsketch_billing_config_v1";

export const BILLING_CONFIG_STORAGE_KEY = STORAGE_KEY;
export const BILLING_CONFIG_LEGACY_STORAGE_KEY = LEGACY_STORAGE_KEY;
export const BILLING_CONFIG_CHANGED_EVENT = "fastcourt:billing-config-changed";

export const DEFAULT_LANDING_PRICING: LandingPricingConfig = {
  individualYearlyEur: 99,
  individualMonthlyEur: 10,
  clubAdminYearlyEur: 99,
  clubCoachSeatYearlyEur: 49,
  clubCoachSeatMonthlyEur: 5,
  yearlySavePercent: 17,
  clubCoachMin: 1,
  clubCoachMax: 20,
  clubCoachDefault: 10,
};

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  supportEmail: ADMIN_EMAIL,
  defaultTrialDays: DEFAULT_TRIAL_DAYS,
  monthlyPaymentUrl: "",
  annualPaymentUrl: "",
  methods: getDefaultPaymentMethods(),
  deviceLimitPerCoach: 2,
  plans: [
    {
      id: "trial",
      label: "Trial",
      priceLabel: "Free",
      trialDays: DEFAULT_TRIAL_DAYS,
      active: true,
    },
    {
      id: "annual",
      label: "Annual",
      priceLabel: "€99 / year",
      trialDays: 0,
      active: true,
    },
  ],
  landingPricing: { ...DEFAULT_LANDING_PRICING },
};

function isBrowser() {
  return typeof window !== "undefined";
}

function migrateFlatUrls(config: BillingConfig): BillingConfig {
  const methods = { ...config.methods };
  if (config.annualPaymentUrl && !methods.stripe.url) {
    methods.stripe = {
      ...methods.stripe,
      url: config.annualPaymentUrl,
      enabled: true,
    };
  }
  if (config.monthlyPaymentUrl && !methods.stripe.urlMonthly) {
    methods.stripe = {
      ...methods.stripe,
      urlMonthly: config.monthlyPaymentUrl,
      enabled: methods.stripe.enabled || !!config.annualPaymentUrl,
    };
  }
  return { ...config, methods };
}

function normalizeSupportEmail(raw: unknown): string {
  const email = String(raw ?? "").trim();
  if (!email || email === "support@fastcourt.eu") return ADMIN_EMAIL;
  return email;
}

function clampMoney(value: unknown, fallback: number, max = 9999) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, Math.round(n * 100) / 100);
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeLandingPricing(raw: unknown): LandingPricingConfig {
  const input =
    raw && typeof raw === "object" ? (raw as Partial<LandingPricingConfig>) : {};
  const clubCoachMin = clampInt(input.clubCoachMin, DEFAULT_LANDING_PRICING.clubCoachMin, 1, 50);
  const clubCoachMax = clampInt(
    input.clubCoachMax,
    DEFAULT_LANDING_PRICING.clubCoachMax,
    clubCoachMin,
    100,
  );
  const clubCoachDefault = clampInt(
    input.clubCoachDefault,
    DEFAULT_LANDING_PRICING.clubCoachDefault,
    clubCoachMin,
    clubCoachMax,
  );

  return {
    individualYearlyEur: clampMoney(
      input.individualYearlyEur,
      DEFAULT_LANDING_PRICING.individualYearlyEur,
    ),
    individualMonthlyEur: clampMoney(
      input.individualMonthlyEur,
      DEFAULT_LANDING_PRICING.individualMonthlyEur,
    ),
    clubAdminYearlyEur: clampMoney(
      input.clubAdminYearlyEur,
      DEFAULT_LANDING_PRICING.clubAdminYearlyEur,
    ),
    clubCoachSeatYearlyEur: clampMoney(
      input.clubCoachSeatYearlyEur,
      DEFAULT_LANDING_PRICING.clubCoachSeatYearlyEur,
    ),
    clubCoachSeatMonthlyEur: clampMoney(
      input.clubCoachSeatMonthlyEur,
      DEFAULT_LANDING_PRICING.clubCoachSeatMonthlyEur,
    ),
    yearlySavePercent: clampInt(
      input.yearlySavePercent,
      DEFAULT_LANDING_PRICING.yearlySavePercent,
      0,
      90,
    ),
    clubCoachMin,
    clubCoachMax,
    clubCoachDefault,
  };
}

function syncAnnualPlanPriceLabel(config: BillingConfig): BillingConfig {
  const yearly = config.landingPricing.individualYearlyEur;
  return {
    ...config,
    plans: config.plans.map((plan) =>
      plan.id === "annual"
        ? { ...plan, priceLabel: `€${yearly} / year` }
        : plan,
    ),
  };
}

export function normalizeBillingConfig(raw: unknown): BillingConfig {
  const input =
    raw && typeof raw === "object" ? (raw as Partial<BillingConfig>) : {};
  const methods = normalizePaymentMethods(
    input.methods ??
      (input as { methods?: BillingConfig["methods"] }).methods,
  );

  if ((input as { stripePaymentLinkUrl?: string }).stripePaymentLinkUrl) {
    const legacyUrl = String(
      (input as { stripePaymentLinkUrl?: string }).stripePaymentLinkUrl,
    ).trim();
    if (legacyUrl && !methods.stripe.url) {
      methods.stripe = { ...methods.stripe, url: legacyUrl, enabled: true };
    }
  }

  const merged: BillingConfig = {
    ...DEFAULT_BILLING_CONFIG,
    ...input,
    supportEmail: normalizeSupportEmail(input.supportEmail),
    defaultTrialDays: Math.min(
      90,
      Math.max(1, Number(input.defaultTrialDays) || DEFAULT_TRIAL_DAYS),
    ),
    monthlyPaymentUrl: String(input.monthlyPaymentUrl ?? "").trim(),
    annualPaymentUrl: String(input.annualPaymentUrl ?? "").trim(),
    methods,
    deviceLimitPerCoach: Math.min(
      10,
      Math.max(1, Number(input.deviceLimitPerCoach) || 2),
    ),
    plans: Array.isArray(input.plans) && input.plans.length
      ? input.plans.map((p, i) => ({
          ...DEFAULT_BILLING_CONFIG.plans[i]!,
          ...p,
        }))
      : DEFAULT_BILLING_CONFIG.plans,
    landingPricing: normalizeLandingPricing(input.landingPricing),
  };

  return syncAnnualPlanPriceLabel(
    migrateFlatUrls(syncTrialPlanDays(merged)),
  );
}

function syncTrialPlanDays(config: BillingConfig): BillingConfig {
  return {
    ...config,
    plans: config.plans.map((plan) =>
      plan.id === "trial"
        ? { ...plan, trialDays: config.defaultTrialDays }
        : plan,
    ),
  };
}

export function withDefaultTrialDays(
  config: BillingConfig,
  days: number,
): BillingConfig {
  const defaultTrialDays = Math.min(90, Math.max(1, days || DEFAULT_TRIAL_DAYS));
  return syncTrialPlanDays({ ...config, defaultTrialDays });
}

export function loadBillingConfig(): BillingConfig {
  if (!isBrowser()) return { ...DEFAULT_BILLING_CONFIG };
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BILLING_CONFIG };
    return normalizeBillingConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_BILLING_CONFIG };
  }
}

export function saveBillingConfig(config: BillingConfig) {
  if (!isBrowser()) return;
  const normalized = normalizeBillingConfig(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(BILLING_CONFIG_CHANGED_EVENT));
}
