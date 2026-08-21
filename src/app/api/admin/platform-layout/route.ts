import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isCloudConfigured,
  isServiceRoleConfigured,
} from "@/lib/supabase/env";
import { normalizePlatformLayout } from "@/lib/settings/platform-layout";
import type { PlatformLayoutSettings } from "@/types/platform-layout";

const ROW_ID = "default";

async function getAuthedUser() {
  if (!isCloudConfigured()) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* read-only in route handlers that only need the session */
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function serviceClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(userId: string) {
  const admin = serviceClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

async function upsertPlatformSettingsRow(layout: PlatformLayoutSettings) {
  const admin = serviceClient();
  const { error } = await admin.from("platform_settings").upsert(
    {
      id: ROW_ID,
      layout: {
        libraryColumns: layout.libraryColumns,
        libraryFramesGrid: layout.libraryFramesGrid,
        designerColumns: layout.designerColumns,
      },
      updated_at: layout.updatedAt,
    },
    { onConflict: "id" },
  );
  return error;
}

async function fanOutLayoutToUserSettings(layout: PlatformLayoutSettings) {
  const admin = serviceClient();
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id");
  if (profileError) {
    return { ok: false as const, error: profileError.message, updated: 0 };
  }

  const { data: existing, error } = await admin
    .from("user_settings")
    .select("user_id, appearance");
  if (error) return { ok: false as const, error: error.message, updated: 0 };

  const byUser = new Map(
    (existing ?? []).map((row) => [row.user_id as string, row.appearance]),
  );

  let updated = 0;
  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    const appearance =
      byUser.get(userId) && typeof byUser.get(userId) === "object"
        ? { ...(byUser.get(userId) as Record<string, unknown>) }
        : {};
    const next = {
      ...appearance,
      libraryColumns: layout.libraryColumns,
      libraryFramesGrid: layout.libraryFramesGrid,
      designerColumns: layout.designerColumns,
    };

    if (byUser.has(userId)) {
      const { error: upErr } = await admin
        .from("user_settings")
        .update({
          appearance: next,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (!upErr) updated += 1;
    } else {
      const { error: insErr } = await admin.from("user_settings").insert({
        user_id: userId,
        appearance: next,
        updated_at: new Date().toISOString(),
      });
      if (!insErr) updated += 1;
    }
  }
  return { ok: true as const, updated };
}

export async function GET() {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud not configured" }, { status: 503 });
  }
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = serviceClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("layout, updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    if (/platform_settings/i.test(error.message)) {
      return NextResponse.json({ ok: true, layout: null, tableMissing: true });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data?.layout) return NextResponse.json({ ok: true, layout: null });
  return NextResponse.json({
    ok: true,
    layout: normalizePlatformLayout({
      ...(data.layout as object),
      updatedAt: data.updated_at ?? undefined,
    }),
  });
}

export async function PUT(request: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: "Cloud not configured" }, { status: 503 });
  }
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!(await assertAdmin(user.id))) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { layout?: unknown }
    | null;
  const layout = normalizePlatformLayout(body?.layout ?? {});

  const tableError = await upsertPlatformSettingsRow(layout);
  const fanOut = await fanOutLayoutToUserSettings(layout);

  if (tableError && !fanOut.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: tableError.message,
        hint: "Run supabase/migrations/017_platform_settings.sql in the Supabase SQL Editor.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    layout,
    platformTable: tableError ? tableError.message : "ok",
    fanOutUpdated: fanOut.ok ? fanOut.updated : 0,
  });
}
