import {
  getDefaultPaymentMethods,
  normalizePaymentMethods,
} from "@/lib/settings/payment-methods";
import type { BillingConfig } from "@/types/billing-config";

const STORAGE_KEY = "fastcourt_billing_config_v1";
const LEGACY_STORAGE_KEY = "playsketch_billing_config_v1";

export const DEFAULT_BILLING_CONFIG: BillingConfig = {
  supportEmail: "support@fastcourt.eu",
  defaultTrialDays: 14,
  monthlyPaymentUrl: "",
  annualPaymentUrl: "",
  methods: getDefaultPaymentMethods(),
  deviceLimitPerCoach: 2,
  plans: [
    {
      id: "trial",
      label: "Trial",
      priceLabel: "Free",
      trialDays: 14,
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
    supportEmail:
      String(input.supportEmail ?? "").trim() ||
      DEFAULT_BILLING_CONFIG.supportEmail,
    defaultTrialDays: Math.min(
      90,
      Math.max(1, Number(input.defaultTrialDays) || 14),
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
  };

  return migrateFlatUrls(merged);
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
}
