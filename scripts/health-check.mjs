#!/usr/bin/env node
/**
 * FastCourt Next — health check & functional test runner.
 *
 * Runs automated unit tests, static analysis, optional lint/build,
 * documents known migration gaps, and prints a manual QA checklist.
 *
 * Usage:
 *   node scripts/health-check.mjs
 *   node scripts/health-check.mjs --lint --build
 *   node scripts/health-check.mjs --json=health-check-report.json
 *   npm run health-check
 *   npm run health-check:full
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/** @type {Array<{category:string,name:string,status:string,detail?:string}>} */
const results = [];

/** @type {Array<{area:string,item:string,status:string,notes?:string}>} */
const knownGaps = [];

/** @type {Array<{area:string,steps:string[]}>} */
const manualChecklist = [
  {
    area: "Login / Auth",
    steps: [
      "Email/password login (local + cloud if configured)",
      "OAuth buttons (Google/Apple/Facebook) when cloud is on",
      "Signup wizard completes and redirects to library",
      "Team invite link pre-fills on login page",
    ],
  },
  {
    area: "Library",
    steps: [
      "Create new play, open in designer",
      "Import .fdb file, preview thumbnails render",
      "Playbooks tab: present / print / share",
      "Practice tab: create session, live timer",
      "Players tab: roster list loads",
    ],
  },
  {
    area: "Designer",
    steps: [
      "Place O/D players, assign ball (tap player)",
      "Draw pass → next frame → ball on receiver",
      "Dribble + pass chain, handoff, cut, screen",
      "Formations & FastBuild apply correctly",
      "Undo/redo, frame duplicate, mirror frame/play",
      "Animation playback timing & ball transfer",
      "Whiteboard ink + eraser on frame",
    ],
  },
  {
    area: "Settings / Admin",
    steps: [
      "Coach subscription & PDF branding save",
      "Admin users CRUD (if admin role)",
      "Appearance settings persist after reload",
    ],
  },
];

function record(category, name, status, detail = "") {
  results.push({ category, name, status, detail: detail.slice(0, 500) });
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

function checkKnownGaps() {
  const gaps = [
    {
      area: "Designer",
      item: "WebM/MP4 animation export",
      path: "src/components/designer/DesignerScreen.tsx",
      pattern: /Export animation \(WebM\)/,
      invertPattern: true,
    },
    {
      area: "Designer",
      item: "Court zoom UI (+/−/reset buttons)",
      path: "src/components/designer/DesignerScreen.tsx",
      pattern: /zoomCourtIn/,
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
        implemented = gap.invertPattern ? !gap.pattern.test(src) : gap.pattern.test(src);
      }
    }

    const status = implemented ? "done" : "missing";
    knownGaps.push({
      area: gap.area,
      item: gap.item,
      status,
      notes: implemented ? "Implemented or partially present" : "Not yet migrated from legacy",
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

  const byCategory = new Map();
  for (const r of results) {
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
  for (const section of manualChecklist) {
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
      results,
      knownGaps,
      manualChecklist,
    };
    fs.writeFileSync(path.join(ROOT, jsonOut), JSON.stringify(report, null, 2));
    console.log(`Report written: ${jsonOut}`);
  }

  return counts.fail === 0;
}

function main() {
  console.log("FastCourt health check starting...\n");

  const testFiles = discoverTestFiles();
  if (!testFiles.length) {
    record("unit", "test discovery", "fail", "No scripts/tests/*.test.ts files found");
  } else {
    const testRun = runCommand(
      `unit tests (${testFiles.length} files)`,
      "unit",
      "npx",
      ["tsx", "--test", ...testFiles],
    );
    if (!testRun.ok) {
      const failMatch = testRun.output.match(/✖[^\n]+/g);
      if (failMatch?.length) {
        record("unit", "failed tests", "fail", failMatch.slice(0, 5).join(" | "));
      }
    }
  }

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
    runCommand("eslint", "quality", "npm", ["run", "lint"]);
  } else {
    record("quality", "eslint", "skip", "Pass --lint to run");
  }

  if (runBuild) {
    runCommand("next build", "quality", "npm", ["run", "build"], {
      env: { ...process.env, CI: "1" },
    });
  } else {
    record("quality", "next build", "skip", "Pass --build to run");
  }

  const ok = printSummary();
  process.exit(ok ? 0 : 1);
}

main();
