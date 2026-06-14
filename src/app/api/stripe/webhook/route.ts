import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  buildSubscriptionPatch,
  updateProfileBillingByCustomerId,
  updateProfileBillingByUserId,
} from "@/lib/billing/stripe-profile";
import { subscriptionPeriodEndUnix, invoiceSubscriptionId } from "@/lib/billing/stripe-access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStripeSecretKey,
  getStripeWebhookSecret,
  isServiceRoleConfigured,
  isStripeConfigured,
} from "@/lib/supabase/env";

export const runtime = "nodejs";

function stripeClient() {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: "2026-05-27.dahlia",
  });
}

async function handleCheckoutCompleted(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  session: Stripe.Checkout.Session,
) {
  const userId =
    session.client_reference_id ||
    (typeof session.metadata?.user_id === "string" ? session.metadata.user_id : null);

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!userId || !customerId) {
    console.warn("FastCourt Stripe: checkout missing user or customer", session.id);
    return;
  }

  let status = "active";
  let periodEnd: number | null = null;

  if (subscriptionId) {
    const stripe = stripeClient();
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data"],
    });
    status = sub.status;
    periodEnd = subscriptionPeriodEndUnix(sub);
  }

  const patch = buildSubscriptionPatch(status, periodEnd, null, customerId, subscriptionId);
  await updateProfileBillingByUserId(admin, userId, patch);
}

async function handleSubscriptionChange(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  subscription: Stripe.Subscription,
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("expires_at")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const patch = buildSubscriptionPatch(
    subscription.status,
    subscriptionPeriodEndUnix(subscription),
    (profile?.expires_at as string | null) ?? null,
    customerId,
    subscription.id,
  );

  await updateProfileBillingByCustomerId(admin, customerId, patch);
}

export async function POST(request: Request) {
  if (!isStripeConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Stripe billing is not configured." }, { status: 503 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin client unavailable." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature.";
    console.warn("FastCourt Stripe webhook:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(admin, event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (subscriptionId) {
          const sub = await stripeClient().subscriptions.retrieve(subscriptionId, {
            expand: ["items.data"],
          });
          await handleSubscriptionChange(admin, sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed.";
    console.error("FastCourt Stripe webhook handler:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
