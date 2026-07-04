#!/usr/bin/env node
/**
 * Link team admin + coach Supabase profiles to a shared library row.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Usage:
 *   node scripts/link-team-library.mjs --org "Team Test" --admin teamtest@gmail.com --coaches coach1@x.com,coach2@x.com
 *   npm run link-team-library -- --org "Team Test" --admin teamtest@gmail.com --coaches a@b.com
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function readArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx < 0 || idx + 1 >= process.argv.length) return "";
  return process.argv[idx + 1].trim();
}

async function main() {
  loadEnvLocal();

  const orgName = readArg("--org");
  const adminEmail = readArg("--admin").toLowerCase();
  const coachesRaw = readArg("--coaches");
  const coaches = coachesRaw
    ? coachesRaw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
    : [];

  if (!orgName || !adminEmail) {
    console.error(
      "Usage: node scripts/link-team-library.mjs --org \"Team Name\" --admin admin@club.com [--coaches coach1@x.com,coach2@x.com]",
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ownerId, error } = await supabase.rpc("admin_link_team_library", {
    p_org_name: orgName,
    p_admin_email: adminEmail,
    p_member_emails: coaches,
  });

  if (error) {
    if (/admin_link_team_library/i.test(error.message) && /does not exist/i.test(error.message)) {
      console.error(
        "RPC admin_link_team_library is missing. Run migrations 010–013 in Supabase SQL Editor first.",
      );
    } else {
      console.error("Link failed:", error.message);
    }
    process.exit(1);
  }

  console.log(`Linked team "${orgName}"`);
  console.log(`  team admin: ${adminEmail}`);
  console.log(`  library owner id: ${ownerId}`);
  if (coaches.length) {
    console.log(`  coaches: ${coaches.join(", ")}`);
  }

  const emails = [adminEmail, ...coaches];
  const { data: rows, error: verifyError } = await supabase
    .from("profiles")
    .select("email, role, organization, team_library_owner_id")
    .in("email", emails);

  if (verifyError) {
    console.warn("Verify query failed:", verifyError.message);
    return;
  }

  console.log("\nProfiles:");
  for (const row of rows ?? []) {
    console.log(
      `  ${row.email} | role=${row.role} | org=${row.organization ?? "NULL"} | owner=${row.team_library_owner_id ?? "NULL"}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
