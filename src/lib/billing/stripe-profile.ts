import type { SupabaseClient } from "@supabase/supabase-js";
import {
  accessFromStripeSubscription,
  stripePeriodEndToIso,
} from "@/lib/billing/stripe-access";

export interface StripeProfileBillingPatch {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  accessType: "trial" | "subscription" | "unlimited";
  expiresAt: string | null;
}

export async function updateProfileBillingByUserId(
  admin: SupabaseClient,
  userId: string,
  patch: StripeProfileBillingPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin
    .from("profiles")
    .update({
      stripe_customer_id: patch.stripeCustomerId,
      stripe_subscription_id: patch.stripeSubscriptionId,
      access_type: patch.accessType,
      expires_at: patch.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateProfileBillingByCustomerId(
  admin: SupabaseClient,
  customerId: string,
  patch: Omit<StripeProfileBillingPatch, "stripeCustomerId"> & {
    stripeCustomerId?: string;
  },
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, expires_at")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) {
    return { ok: false, error: `No profile for Stripe customer ${customerId}.` };
  }

  const result = await updateProfileBillingByUserId(admin, data.id, {
    stripeCustomerId: patch.stripeCustomerId ?? customerId,
    stripeSubscriptionId: patch.stripeSubscriptionId,
    accessType: patch.accessType,
    expiresAt: patch.expiresAt,
  });

  if (!result.ok) return result;
  return { ok: true, userId: data.id };
}

export function buildSubscriptionPatch(
  status: string,
  periodEndUnix: number | null | undefined,
  currentExpiresAt: string | null,
  customerId: string,
  subscriptionId: string | null,
): StripeProfileBillingPatch {
  const access = accessFromStripeSubscription(status, periodEndUnix, currentExpiresAt);
  return {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    accessType: access.accessType,
    expiresAt: access.expiresAt,
  };
}

export { stripePeriodEndToIso };
