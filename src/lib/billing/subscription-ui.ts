import type { BillingConfig } from "@/types/billing-config";
import type { SessionUser } from "@/types/auth";
import { hasFullAccess } from "@/lib/auth/roles";
import { hasOrganizationSubscriptionAccess } from "@/lib/auth/org-access";
import { getActivePaymentMethodsForConfig } from "@/lib/settings/payment-methods";
import type { ActivePaymentMethod } from "@/types/payment-methods";

export type BillingInterval = "annual" | "monthly";

export interface SubscriptionPlanView {
  id: string;
  label: string;
  priceLabel: string;
  display: string;
  methods: ActivePaymentMethod[];
}

export function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

export function formatTrialAccessMessage(user: SessionUser): string {
  if (hasFullAccess(user)) return "Unlimited access";
  if (hasOrganizationSubscriptionAccess(user) && user.organizationName) {
    return `Access provided by ${user.organizationName}.`;
  }
  const days = getDaysRemaining(user.expiresAt);
  if (days === null) return "Trial active";
  if (days <= 0) return "Your trial has ended. Subscribe to keep using FastCourt.";
  if (days === 1) return "1 day left on your trial.";
  return `${days} days left on your trial.`;
}

export function shouldShowTrialBanner(user: SessionUser): boolean {
  if (hasFullAccess(user)) return false;
  if (hasOrganizationSubscriptionAccess(user)) return false;
  if (user.accessType === "subscription") return false;
  return true;
}

export function isTrialWarning(user: SessionUser): boolean {
  if (hasOrganizationSubscriptionAccess(user)) return false;
  const days = getDaysRemaining(user.expiresAt);
  return days !== null && days > 0 && days <= 3;
}

export function isTrialExpired(user: SessionUser): boolean {
  if (hasOrganizationSubscriptionAccess(user)) return false;
  if (user.accessType === "subscription") return false;
  if (!user.expiresAt && user.accessType === "trial") return true;
  const days = getDaysRemaining(user.expiresAt);
  return days !== null && days <= 0 && !hasFullAccess(user);
}

export function getSubscriptionPlans(
  config: BillingConfig,
): SubscriptionPlanView[] {
  const annualPlan = config.plans.find((p) => p.id === "annual") ?? config.plans[0];
  const plans: SubscriptionPlanView[] = [];
  const annualMethods = getActivePaymentMethodsForConfig(config.methods, "annual");
  if (annualPlan) {
    plans.push({
      id: "annual",
      label: annualPlan.label,
      priceLabel: annualPlan.priceLabel,
      display: [annualPlan.label, annualPlan.priceLabel].filter(Boolean).join(" · "),
      methods: annualMethods,
    });
  }
  const monthlyMethods = getActivePaymentMethodsForConfig(config.methods, "monthly");
  if (monthlyMethods.length > 0) {
    const monthly = config.plans.find((p) => p.id === "monthly");
    plans.push({
      id: "monthly",
      label: monthly?.label ?? "Monthly",
      priceLabel: monthly?.priceLabel ?? "",
      display: [monthly?.label ?? "Monthly", monthly?.priceLabel].filter(Boolean).join(" · "),
      methods: monthlyMethods,
    });
  }
  return plans;
}
