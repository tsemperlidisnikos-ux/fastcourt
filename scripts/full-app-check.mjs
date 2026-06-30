#!/usr/bin/env node
/**
 * FastCourt Next — full application check orchestrator.
 *
 * Runs health-check (unit + static + lint + build) and Playwright E2E smoke tests.
 *
 * Usage:
 *   node scripts/full-app-check.mjs
 *   node scripts/full-app-check.mjs --skip-e2e
 *   node scripts/full-app-check.mjs --json=reports/full-app-check.json
 *   npm run app-check
 *   npm run app-check:full
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORTS_DIR = path.join(ROOT, "reports");

const args = new Set(process.argv.slice(2));
const skipE2e = args.has("--skip-e2e");
const skipBuild = args.has("--skip-build");
const jsonArg = [...args].find((a) => a.startsWith("--json"));
const jsonOut = jsonArg
  ? jsonArg.includes("=")
    ? jsonArg.split("=")[1]
    : "reports/full-app-check.json"
  : "";

/** @type {Array<{phase:string,status:string,detail?:string,durationMs?:number}>} */
const phases = [];

function runPhase(name, command, commandArgs, options = {}) {
  const started = Date.now();
  console.log(`\n>>> Phase: ${name}\n`);
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit",
    ...options,
  });
  const durationMs = Date.now() - started;
  const ok = result.status === 0;
  phases.push({
    phase: name,
    status: ok ? "pass" : "fail",
    detail: ok ? "completed" : `exit ${result.status ?? 1}`,
    durationMs,
  });
  return ok;
}

function readJsonIfExists(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return null;
  }
}

function main() {
  console.log("=== FastCourt Full App Check ===\n");
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const healthArgs = [
    "scripts/health-check.mjs",
    "--lint",
    "--json=reports/health-check-report.json",
  ];
  if (!skipBuild) healthArgs.push("--build");

  let allOk = runPhase(
    "Health check (unit + static + lint" + (skipBuild ? "" : " + build") + ")",
    "node",
    healthArgs,
  );

  if (!skipE2e) {
    const e2eOk = runPhase("E2E smoke (Playwright)", "npx", [
      "playwright",
      "test",
      "--reporter=list",
    ]);
    if (!e2eOk) allOk = false;
  } else {
    phases.push({
      phase: "E2E smoke (Playwright)",
      status: "skip",
      detail: "Pass without --skip-e2e to run",
    });
  }

  const healthReport = readJsonIfExists("reports/health-check-report.json");

  console.log("\n=== Full App Check Summary ===\n");
  for (const p of phases) {
    const ms = p.durationMs != null ? ` (${(p.durationMs / 1000).toFixed(1)}s)` : "";
    console.log(`  ${p.status.toUpperCase().padEnd(4)}  ${p.phase}${ms}`);
  }

  if (healthReport?.domainSummary?.length) {
    console.log("\n[domains from health check]");
    for (const d of healthReport.domainSummary) {
      console.log(`  ${d.status.toUpperCase().padEnd(4)}  ${d.name}`);
    }
  }

  console.log(
    `\nOverall: ${allOk ? "PASS — all automated phases succeeded" : "FAIL — see output above"}`,
  );

  if (jsonOut) {
    const outPath = path.isAbsolute(jsonOut)
      ? jsonOut
      : path.join(ROOT, jsonOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          overall: allOk ? "pass" : "fail",
          phases,
          healthReport,
        },
        null,
        2,
      ),
    );
    console.log(`Combined report: ${jsonOut}`);
  }

  process.exit(allOk ? 0 : 1);
}

main();
