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
import {
  adminUserToProfileUpdate,
  isPersistableCloudProfile,
} from "@/lib/auth/profiles-cloud";
import type { AdminUserRecord } from "@/types/admin-user";

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
    | { users?: AdminUserRecord[] }
    | null;
  const users = (body?.users ?? []).filter(isPersistableCloudProfile);
  if (!users.length) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const admin = serviceClient();
  let updated = 0;
  for (const record of users) {
    const payload = adminUserToProfileUpdate(record);
    const { data, error } = await admin
      .from("profiles")
      .update(payload)
      .eq("id", record.id)
      .select("id");
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (data?.length) {
      updated += 1;
      continue;
    }
    const { error: insertError } = await admin.from("profiles").insert(payload);
    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          error: insertError.message,
          hint: "Profile must belong to an existing auth user (signup first).",
        },
        { status: 500 },
      );
    }
    updated += 1;
  }

  return NextResponse.json({ ok: true, updated });
}
