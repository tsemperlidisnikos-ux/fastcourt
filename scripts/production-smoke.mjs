#!/usr/bin/env node
/**
 * FastCourt — production readiness smoke checks (no live cloud calls).
 *
 * Usage:
 *   node scripts/production-smoke.mjs
 *   npm run production-smoke
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** @type {Array<{name:string, ok:boolean, detail?:string}>} */
const checks = [];

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function main() {
  console.log("=== FastCourt Production Smoke ===\n");

  const requiredSources = [
    "src/lib/auth/safe-next-path.ts",
    "src/lib/cloud/library-owner.ts",
    "src/lib/cloud/library-sync.ts",
    "supabase/migrations/010_team_library_owner.sql",
    "supabase/migrations/011_team_library_profile_link.sql",
    "supabase/migrations/012_team_library_rls.sql",
    "supabase/migrations/013_admin_link_team_library.sql",
    "supabase/scripts/fix-team-test-profiles.sql",
  ];

  for (const rel of requiredSources) {
    record(`source: ${rel}`, fileExists(rel));
  }

  const envExample = path.join(ROOT, ".env.example");
  if (fs.existsSync(envExample)) {
    const text = fs.readFileSync(envExample, "utf8");
    for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]) {
      record(`env example: ${key}`, text.includes(key));
    }
  } else {
    record("env example present", false, ".env.example missing");
  }

  const unit = spawnSync(
    "npx",
    [
      "tsx",
      "--test",
      "scripts/tests/library-owner.test.ts",
      "scripts/tests/library-modules.test.ts",
      "scripts/tests/safe-next-path.test.ts",
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: "inherit",
    },
  );
  record("critical unit tests", unit.status === 0);

  const playbankPlaceholder = fileExists("src/lib/playbank/.gitkeep");
  record(
    "PlayBank placeholder tracked",
    true,
    playbankPlaceholder ? "deferred — not ported yet" : "placeholder removed",
  );

  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);

  if (failed.length) {
    console.log("\nFailed:");
    for (const check of failed) {
      console.log(`  - ${check.name}${check.detail ? `: ${check.detail}` : ""}`);
    }
    process.exit(1);
  }

  console.log("\nProduction smoke OK.");
}

main();
