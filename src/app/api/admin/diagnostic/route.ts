import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isOpenAiConfigured, getOpenAiVisionModel } from "@/lib/ai/env";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isCloudConfigured,
  isServiceRoleConfigured,
  isStripeConfigured,
} from "@/lib/supabase/env";
import { APP_BUILD, APP_NAME } from "@/lib/config";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

async function getAuthedUser() {
  if (!isCloudConfigured()) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, supabase };
}

async function assertAdmin(userId: string, userClient: SupabaseClient) {
  if (isServiceRoleConfigured()) {
    const admin = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return data?.role === "admin";
  }
  const { data } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

export async function GET() {
  if (!isCloudConfigured()) {
    return NextResponse.json(
      {
        ok: true,
        app: APP_NAME,
        build: APP_BUILD,
        localMode: true,
        openai: isOpenAiConfigured(),
        openaiModel: getOpenAiVisionModel(),
        serviceRole: isServiceRoleConfigured(),
        stripe: isStripeConfigured(),
        cloud: false,
      },
      { status: 200 },
    );
  }

  const authed = await getAuthedUser();
  if (!authed) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await assertAdmin(authed.user.id, authed.supabase))) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    app: APP_NAME,
    build: APP_BUILD,
    localMode: false,
    openai: isOpenAiConfigured(),
    openaiModel: getOpenAiVisionModel(),
    serviceRole: isServiceRoleConfigured(),
    stripe: isStripeConfigured(),
    cloud: true,
  });
}
