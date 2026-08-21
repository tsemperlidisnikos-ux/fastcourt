import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  const path = join(root, file);
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}

const sql = readFileSync(
  join(root, "supabase/migrations/017_platform_settings.sql"),
  "utf8",
);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Prefer a Postgres RPC if the project has exec_sql; otherwise upsert after manual DDL.
const { error: rpcError } = await supabase.rpc("exec_sql", { query: sql });
if (!rpcError) {
  console.log("Applied 017_platform_settings.sql via exec_sql");
  process.exit(0);
}

console.log("exec_sql unavailable:", rpcError.message);
console.log("Trying direct table upsert (requires migration already applied)...");

const { error } = await supabase.from("platform_settings").upsert(
  { id: "default", layout: {}, updated_at: new Date().toISOString() },
  { onConflict: "id" },
);

if (error) {
  console.error("platform_settings not ready:", error.message);
  console.error("\nApply this SQL in Supabase → SQL Editor:\n");
  console.error(sql);
  process.exit(2);
}

console.log("platform_settings row ok (table already existed)");
