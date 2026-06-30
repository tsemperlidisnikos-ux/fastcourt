#!/usr/bin/env node
/**
 * Bootstrap a FastCourt master administrator account.
 *
 * Usage:
 *   node scripts/create-admin.mjs
 *   node scripts/create-admin.mjs --email you@club.com --name "Your Name"
 *   node scripts/create-admin.mjs --email you@club.com --password "Secret123!" --cloud
 *
 * Local mode (no Supabase): adds email to .env.local and prints signup steps.
 * Cloud mode (--cloud): creates auth user + admin profile when service role is set.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");

const args = process.argv.slice(2);
function readArg(flag, fallback = "") {
  const idx = args.indexOf(flag);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
}

const email = (readArg("--email", "admin@fastcourt.eu") || "")
  .trim()
  .toLowerCase();
const displayName = readArg("--name", "Platform Administrator").trim();
const password = readArg("--password", "FastCourt-Admin-2026!");
const useCloud = args.includes("--cloud");

if (!email.includes("@")) {
  console.error("Provide a valid --email");
  process.exit(1);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

function serializeEnv(entries) {
  return `${Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

function upsertEnvLocal() {
  const current = parseEnvFile(ENV_LOCAL);
  const example = parseEnvFile(ENV_EXAMPLE);

  const existingRaw =
    current.NEXT_PUBLIC_ADMIN_EMAILS ??
    current.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ??
    example.NEXT_PUBLIC_ADMIN_EMAILS ??
    example.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ??
    example.NEXT_PUBLIC_ADMIN_EMAIL ??
    "admin@fastcourt.eu";

  const emails = existingRaw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  if (!emails.includes(email)) emails.push(email);

  current.NEXT_PUBLIC_ADMIN_EMAILS = emails.join(",");
  if (!current.NEXT_PUBLIC_MASTER_ADMIN_EMAIL) {
    current.NEXT_PUBLIC_MASTER_ADMIN_EMAIL =
      example.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ??
      example.NEXT_PUBLIC_ADMIN_EMAIL ??
      emails[0];
  }
  if (!current.NEXT_PUBLIC_ADMIN_EMAIL) {
    current.NEXT_PUBLIC_ADMIN_EMAIL =
      example.NEXT_PUBLIC_ADMIN_EMAIL ?? emails[0];
  }
  if (!current.NEXT_PUBLIC_APP_BUILD) {
    current.NEXT_PUBLIC_APP_BUILD = example.NEXT_PUBLIC_APP_BUILD ?? "next-v7";
  }

  fs.writeFileSync(ENV_LOCAL, serializeEnv(current), "utf8");
  return current;
}

async function createCloudAdmin(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey || url.includes("YOUR_PROJECT")) {
    console.error(
      "Cloud mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (createError || !created.user) {
    console.error("Supabase createUser failed:", createError?.message ?? "unknown");
    process.exit(1);
  }

  const userId = created.user.id;
  const now = new Date().toISOString();
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      display_name: displayName,
      role: "admin",
      access_type: "unlimited",
      trial_days: 0,
      expires_at: null,
      organization: "FastCourt",
      created_at: now,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    console.error("Profile upsert failed:", profileError.message);
    process.exit(1);
  }

  return userId;
}

function printLocalInstructions() {
  console.log("\n=== Local admin ready ===\n");
  console.log(`Email:    ${email}`);
  console.log(`Password: any password (local demo mode)`);
  console.log(`Name:     ${displayName}`);
  console.log("\nSteps:");
  console.log("1. Restart dev server: npm run dev");
  console.log("2. Open /login → Sign up with the email above");
  console.log("3. Open Settings → full administrator panel");
  console.log("\nAdmin bootstrap emails are stored in .env.local:");
  console.log("  NEXT_PUBLIC_ADMIN_EMAILS");
}

async function main() {
  console.log("=== FastCourt — create administrator ===\n");
  const env = upsertEnvLocal();
  console.log(`Updated ${ENV_LOCAL}`);

  if (useCloud) {
    const userId = await createCloudAdmin(env);
    console.log("\n=== Cloud admin created ===\n");
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID:  ${userId}`);
    console.log("\nSign in at /login with these credentials.");
    return;
  }

  printLocalInstructions();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
