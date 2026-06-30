import { NextResponse } from "next/server";
import { fetchProfile } from "@/lib/auth/profile";
import { upsertProfileForUser } from "@/lib/auth/signup";
import {
  PASSWORD_RECOVERY_LOGIN_PATH,
  safeNextPath,
} from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { isCloudConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const recovery = searchParams.get("recovery") === "1";
  const next = recovery
    ? PASSWORD_RECOVERY_LOGIN_PATH
    : safeNextPath(searchParams.get("next"));

  if (!isCloudConfigured() || !code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  if (data.user) {
    const existing = await fetchProfile(supabase, data.user.id);
    if (!existing) {
      const meta = data.user.user_metadata as { display_name?: string } | undefined;
      await upsertProfileForUser(supabase, data.user, meta?.display_name);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
