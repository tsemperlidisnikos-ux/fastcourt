import { NextResponse } from "next/server";
import { upsertProfileForUser } from "@/lib/auth/signup";
import { createClient } from "@/lib/supabase/server";
import { isCloudConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/library";

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
    const meta = data.user.user_metadata as { display_name?: string } | undefined;
    await upsertProfileForUser(supabase, data.user, meta?.display_name);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
