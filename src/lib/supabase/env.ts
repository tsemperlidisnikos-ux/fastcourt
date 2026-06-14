const PLACEHOLDER_MARKERS = ["YOUR_PROJECT", "YOUR_ANON_KEY", "xxxx.supabase.co"];
const SUPABASE_PROJECT_URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;

function isPlaceholder(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

export function isValidSupabaseProjectUrl(url: string) {
  return SUPABASE_PROJECT_URL_RE.test(url.trim());
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? "";
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? "";
}

export function isServiceRoleConfigured() {
  const url = getSupabaseUrl().trim();
  const key = getSupabaseServiceRoleKey().trim();
  return Boolean(
    url &&
      key &&
      !isPlaceholder(url) &&
      !isPlaceholder(key) &&
      isValidSupabaseProjectUrl(url),
  );
}

export function isStripeConfigured() {
  const key = getStripeSecretKey().trim();
  const webhook = getStripeWebhookSecret().trim();
  return Boolean(key && !isPlaceholder(key) && webhook && !isPlaceholder(webhook));
}

export function isCloudConfigured() {
  const url = getSupabaseUrl().trim();
  const key = getSupabaseAnonKey().trim();
  return Boolean(
    url &&
      key &&
      !isPlaceholder(url) &&
      !isPlaceholder(key) &&
      isValidSupabaseProjectUrl(url),
  );
}

/** Human-readable hint when cloud auth is expected but env/build is wrong. */
export function getCloudConfigIssue(): string | null {
  const url = getSupabaseUrl().trim();
  const key = getSupabaseAnonKey().trim();
  if (!url && !key) {
    return "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild.";
  }
  if (!url || isPlaceholder(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL is missing or still a placeholder. Rebuild after fixing it in Plesk.";
  }
  if (!isValidSupabaseProjectUrl(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL (https://YOUR_REF.supabase.co), not an API key. Check Settings → API in the Supabase dashboard.";
  }
  if (!key || isPlaceholder(key)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still a placeholder. Rebuild after fixing it in Plesk.";
  }
  return null;
}
