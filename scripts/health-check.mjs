#!/usr/bin/env node
/**
 * FastCourt Next — health check & functional test runner.
 *
 * Runs unit tests per feature domain, static analysis, optional lint/build,
 * documents known migration gaps, and prints a manual QA checklist.
 *
 * Usage:
 *   node scripts/health-check.mjs
 *   node scripts/health-check.mjs --lint --build
 *   node scripts/health-check.mjs --strict-coverage
 *   npm run health-check
 *   npm run health-check:full
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_DOMAINS, MANUAL_CHECKLIST } from "./check-config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TESTS_DIR = path.join(ROOT, "scripts", "tests");

const args = new Set(process.argv.slice(2));
const runLint = args.has("--lint");
const runBuild = args.has("--build");
const jsonArg = [...args].find((a) => a.startsWith("--json"));
const jsonOut = jsonArg
  ? jsonArg.includes("=")
    ? jsonArg.split("=")[1]
    : "health-check-report.json"
  : "";

/** @type {Array<{category:string,name:string,status:string,detail?:string,domain?:string}>} */
const results = [];

/** @type {Array<{id:string,name:string,status:string,passed:number,failed:number,skipped:number,warn:number,detail?:string}>} */
const domainSummary = [];

/** @type {Array<{area:string,item:string,status:string,notes?:string}>} */
const knownGaps = [];

function record(category, name, status, detail = "", domain = "") {
  results.push({
    category,
    name,
    status,
    detail: detail.slice(0, 500),
    domain,
  });
}

function statusIcon(status) {
  if (status === "pass") return "OK";
  if (status === "fail") return "FAIL";
  if (status === "warn") return "WARN";
  if (status === "skip") return "SKIP";
  return status.toUpperCase();
}

function runCommand(label, category, command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const tail = output.split(/\r?\n/).slice(-12).join(" | ");
  const ok = result.status === 0;
  record(category, label, ok ? "pass" : "fail", tail || `exit ${result.status}`);
  return { ok, output, status: result.status ?? 1 };
}

function dirHasSourceFiles(relDir) {
  const full = path.join(ROOT, relDir);
  if (!fs.existsSync(full)) return false;
  const entries = fs.readdirSync(full, { recursive: true });
  return entries.some(
    (e) =>
      typeof e === "string" &&
      /\.(tsx?|jsx?)$/.test(e) &&
      !e.endsWith(".gitkeep"),
  );
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function discoverTestFiles() {
  if (!fs.existsSync(TESTS_DIR)) return [];
  return fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith(".test.ts"))
    .sort()
    .map((f) => path.join(TESTS_DIR, f));
}

function checkDomainModules(domain) {
  if (!domain.modules?.length) return true;
  const missing = domain.modules.filter((m) => !exists(m));
  if (missing.length) {
    record(
      domain.id,
      `${domain.name} — modules`,
      "fail",
      `Missing: ${missing.join(", ")}`,
      domain.id,
    );
    return false;
  }
  record(
    domain.id,
    `${domain.name} — modules`,
    "pass",
    `${domain.modules.length} core files present`,
    domain.id,
  );
  return true;
}

function runDomainTests(domain) {
  const testPaths = (domain.tests ?? [])
    .map((f) => path.join(TESTS_DIR, f))
    .filter((p) => fs.existsSync(p));

  if (!testPaths.length) {
    record(
      domain.id,
      `${domain.name} — unit tests`,
      "skip",
      "No test files for this domain yet",
      domain.id,
    );
    domainSummary.push({
      id: domain.id,
      name: domain.name,
      status: "skip",
      passed: 0,
      failed: 0,
      skipped: 1,
      warn: 0,
      detail: "No tests",
    });
    return true;
  }

  const run = runCommand(
    `${domain.name} — unit tests (${testPaths.length})`,
    domain.id,
    "npx",
    ["tsx", "--test", ...testPaths],
  );

  domainSummary.push({
    id: domain.id,
    name: domain.name,
    status: run.ok ? "pass" : "fail",
    passed: run.ok ? testPaths.length : 0,
    failed: run.ok ? 0 : 1,
    skipped: 0,
    warn: 0,
    detail: run.ok ? "All tests passed" : "See output above",
  });

  if (!run.ok) {
    const failMatch = run.output.match(/✖[^\n]+/g);
    if (failMatch?.length) {
      record(
        domain.id,
        `${domain.name} — failures`,
        "fail",
        failMatch.slice(0, 5).join(" | "),
        domain.id,
      );
    }
  }

  return run.ok;
}

function checkTestCoverage() {
  const all = discoverTestFiles().map((p) => path.basename(p));
  const mapped = new Map();
  const duplicates = [];

  for (const domain of FEATURE_DOMAINS) {
    for (const file of domain.tests ?? []) {
      if (mapped.has(file)) {
        duplicates.push(`${file} (${mapped.get(file)}, ${domain.id})`);
      } else {
        mapped.set(file, domain.id);
      }
    }
  }

  const unmapped = all.filter((f) => !mapped.has(f));
  const strict = process.env.CI === "1" || args.has("--strict-coverage");

  if (duplicates.length) {
    record(
      "coverage",
      "duplicate test mappings",
      "fail",
      duplicates.join(", "),
      "coverage",
    );
  } else {
    record(
      "coverage",
      "duplicate test mappings",
      "pass",
      "Each test file belongs to one domain",
    );
  }

  if (unmapped.length) {
    record(
      "coverage",
      "unmapped test files",
      strict ? "fail" : "warn",
      unmapped.join(", "),
      "coverage",
    );
  } else {
    record(
      "coverage",
      "unmapped test files",
      "pass",
      `All ${all.length} test files mapped to a domain`,
    );
  }

  record(
    "coverage",
    "unit test files",
    "pass",
    `${all.length} files across ${FEATURE_DOMAINS.length} domains`,
    "coverage",
  );

  return duplicates.length === 0 && unmapped.length === 0;
}

function checkKnownGaps() {
  const gaps = [
    {
      area: "Designer",
      item: "WebM/MP4 animation export",
      path: "src/components/designer/DesignerScreen.tsx",
      pattern: /handleExportAnimationMp4|exportPlayAnimationMp4/,
    },
    {
      area: "PlayBank",
      item: "PlayBank overlay & catalog",
      check: () => dirHasSourceFiles("src/components/playbank"),
    },
    {
      area: "Infrastructure",
      item: "Service worker / offline PWA",
      check: () => exists("public/sw.js") || exists("src/sw.ts"),
    },
    {
      area: "Infrastructure",
      item: "Cloud sync library panel",
      check: () => dirHasSourceFiles("src/lib/cloud"),
    },
  ];

  for (const gap of gaps) {
    let implemented = false;

    if (typeof gap.check === "function") {
      implemented = gap.check();
    } else {
      const fullPath = path.join(ROOT, gap.path);

      if (gap.exists) {
        implemented = fs.existsSync(fullPath);
      } else if (gap.pattern && fs.existsSync(fullPath)) {
        const src = fs.readFileSync(fullPath, "utf8");
        implemented = gap.invertPattern
          ? !gap.pattern.test(src)
          : gap.pattern.test(src);
      }
    }

    const status = implemented ? "done" : "missing";
    knownGaps.push({
      area: gap.area,
      item: gap.item,
      status,
      notes: implemented
        ? "Implemented or partially present"
        : "Not yet migrated from legacy",
    });
    if (!implemented) {
      record("gap", gap.item, "warn", `${gap.area}: migration gap`);
    }
  }
}

function printSummary() {
  const counts = { pass: 0, fail: 0, warn: 0, skip: 0 };
  for (const r of results) {
    if (r.status in counts) counts[r.status]++;
  }

  console.log("\n=== FastCourt Health Check ===\n");

  console.log("[feature domains]");
  for (const d of domainSummary) {
    const detail = d.detail ? ` — ${d.detail}` : "";
    console.log(`  ${statusIcon(d.status)}  ${d.name}${detail}`);
  }
  console.log("");

  const byCategory = new Map();
  for (const r of results) {
    if (r.category === "gap" || FEATURE_DOMAINS.some((d) => d.id === r.category)) {
      continue;
    }
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category).push(r);
  }

  for (const [category, items] of byCategory) {
    console.log(`[${category}]`);
    for (const item of items) {
      const detail = item.detail ? ` — ${item.detail}` : "";
      console.log(`  ${statusIcon(item.status)}  ${item.name}${detail}`);
    }
    console.log("");
  }

  const missingGaps = knownGaps.filter((g) => g.status === "missing");
  if (missingGaps.length) {
    console.log("[known migration gaps — not test failures]");
    for (const gap of missingGaps) {
      console.log(`  WARN  ${gap.area}: ${gap.item}`);
    }
    console.log("");
  }

  console.log("[manual QA checklist — run in browser]");
  for (const section of MANUAL_CHECKLIST) {
    console.log(`  ${section.area}:`);
    for (const step of section.steps) {
      console.log(`    - ${step}`);
    }
  }
  console.log("");

  console.log(
    `Summary: ${counts.pass} passed, ${counts.fail} failed, ${counts.warn} warnings, ${counts.skip} skipped`,
  );

  if (jsonOut) {
    const report = {
      generatedAt: new Date().toISOString(),
      root: ROOT,
      summary: counts,
      domainSummary,
      results,
      knownGaps,
      manualChecklist: MANUAL_CHECKLIST,
    };
    const outPath = path.isAbsolute(jsonOut)
      ? jsonOut
      : path.join(ROOT, jsonOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Report written: ${jsonOut}`);
  }

  return counts.fail === 0;
}

function main() {
  console.log("FastCourt health check starting...\n");

  let allDomainsOk = true;

  for (const domain of FEATURE_DOMAINS) {
    checkDomainModules(domain);
    const ok = runDomainTests(domain);
    if (!ok) allDomainsOk = false;
  }

  const coverageOk = checkTestCoverage();
  if (!coverageOk) allDomainsOk = false;

  const importRun = spawnSync("node", ["scripts/analyze-imports.mjs", ROOT], {
    cwd: ROOT,
    encoding: "utf8",
  });
  try {
    const graph = JSON.parse(importRun.stdout || "{}");
    const cycles = graph.circularDependencies ?? [];
    record(
      "static",
      "circular dependencies",
      cycles.length === 0 ? "pass" : "fail",
      cycles.length
        ? cycles
            .slice(0, 3)
            .map((c) => c.join(" → "))
            .join(" | ")
        : "0 cycles",
    );
    const orphans = graph.orphanModules ?? [];
    if (orphans.length > 5) {
      record(
        "static",
        "orphan modules",
        "warn",
        `${orphans.length} TS modules not reachable from app entries`,
      );
    } else {
      record("static", "orphan modules", "pass", `${orphans.length} orphans`);
    }
  } catch {
    record(
      "static",
      "import graph",
      importRun.status === 0 ? "warn" : "fail",
      "Could not parse analyze-imports output",
    );
  }

  if (fs.existsSync(path.join(ROOT, "AUDIT.md"))) {
    record("static", "AUDIT.md present", "pass", "Migration baseline documented");
  }

  checkKnownGaps();

  if (runLint) {
    const lint = runCommand("eslint", "quality", "npm", ["run", "lint"]);
    if (!lint.ok) allDomainsOk = false;
  } else {
    record("quality", "eslint", "skip", "Pass --lint to run");
  }

  if (runBuild) {
    const build = runCommand("next build", "quality", "npm", ["run", "build"], {
      env: { ...process.env, CI: "1" },
    });
    if (!build.ok) allDomainsOk = false;
  } else {
    record("quality", "next build", "skip", "Pass --build to run");
  }

  const ok = printSummary() && allDomainsOk;
  process.exit(ok ? 0 : 1);
}

main();
