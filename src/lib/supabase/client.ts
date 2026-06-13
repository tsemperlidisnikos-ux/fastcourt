import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, isCloudConfigured } from "@/lib/supabase/env";

export function createClient() {
  if (!isCloudConfigured()) {
    return null;
  }

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

export function isCloudEnabled() {
  return isCloudConfigured();
}

export const OAUTH_PROVIDERS = ["google", "apple", "facebook"] as const;
