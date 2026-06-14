import type { AccessType } from "@/types/auth";

export type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface StripeAccessUpdate {
  accessType: AccessType;
  expiresAt: string | null;
  active: boolean;
}

/** Convert Stripe period end (unix seconds) to ISO string. */
export function stripePeriodEndToIso(periodEndUnix: number): string {
  return new Date(periodEndUnix * 1000).toISOString();
}

/** Extend expiry from a base date by subscription period end (never shorten). */
export function mergeSubscriptionExpiry(
  currentExpiresAt: string | null,
  periodEndUnix: number,
): string {
  const periodEnd = new Date(periodEndUnix * 1000);
  if (!currentExpiresAt) return periodEnd.toISOString();

  const current = new Date(currentExpiresAt);
  if (Number.isNaN(current.getTime())) return periodEnd.toISOString();
  return (current > periodEnd ? current : periodEnd).toISOString();
}

/** Latest billing period end from subscription items (Stripe API v2026+). */
export function subscriptionPeriodEndUnix(
  subscription: { items?: { data?: Array<{ current_period_end: number }> } },
): number | null {
  const items = subscription.items?.data;
  if (!items?.length) return null;
  return Math.max(...items.map((item) => item.current_period_end));
}

/** Subscription id from a Stripe invoice (API v2026+). */
export function invoiceSubscriptionId(invoice: {
  parent?: {
    subscription_details?: {
      subscription?: string | { id: string };
    } | null;
  } | null;
}): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

/** Map Stripe subscription status to profile access fields. */
export function accessFromStripeSubscription(
  status: string,
  periodEndUnix: number | null | undefined,
  currentExpiresAt: string | null = null,
): StripeAccessUpdate {
  const normalized = status as StripeSubscriptionStatus;
  const entitled =
    normalized === "active" ||
    normalized === "trialing" ||
    normalized === "past_due" ||
    normalized === "canceled";

  if (!entitled) {
    const expired =
      currentExpiresAt != null && new Date(currentExpiresAt).getTime() < Date.now();
    return {
      accessType: expired ? "trial" : "subscription",
      expiresAt: currentExpiresAt,
      active: false,
    };
  }

  if (periodEndUnix == null) {
    return {
      accessType: "subscription",
      expiresAt: currentExpiresAt,
      active: normalized === "active" || normalized === "trialing",
    };
  }

  const expiresAt = mergeSubscriptionExpiry(currentExpiresAt, periodEndUnix);
  const stillValid = new Date(expiresAt).getTime() >= Date.now();

  return {
    accessType: stillValid ? "subscription" : "trial",
    expiresAt: stillValid ? expiresAt : new Date().toISOString(),
    active: stillValid && normalized !== "canceled",
  };
}
