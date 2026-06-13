const PLACEHOLDER_MARKERS = ["YOUR_PROJECT", "YOUR_ANON_KEY", "xxxx.supabase.co"];

function isPlaceholder(value: string) {
  const normalized = value.trim();
  if (!normalized) return true;
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function isCloudConfigured() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && !isPlaceholder(url) && !isPlaceholder(key));
}

/** Human-readable hint when cloud auth is expected but env/build is wrong. */
export function getCloudConfigIssue(): string | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url && !key) {
    return "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild.";
  }
  if (!url || isPlaceholder(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL is missing or still a placeholder. Rebuild after fixing it in Plesk.";
  }
  if (!key || isPlaceholder(key)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still a placeholder. Rebuild after fixing it in Plesk.";
  }
  return null;
}
