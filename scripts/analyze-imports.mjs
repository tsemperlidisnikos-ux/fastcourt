#!/usr/bin/env node
/**
 * FastCourt Next — TypeScript import graph analyzer.
 * Outputs JSON to stdout for analyze-project.ps1 (or standalone use).
 *
 * Usage:
 *   node scripts/analyze-imports.mjs [projectRoot]
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, ".."));
const SRC = path.join(ROOT, "src");

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(['"]([^'"]+)['"]\)/g;

const ENTRY_PATTERNS = [
  /^src\/app\/(.*\/)?page\.(tsx|ts)$/,
  /^src\/app\/(.*\/)?layout\.(tsx|ts)$/,
  /^src\/app\/(.*\/)?route\.(tsx|ts)$/,
  /^src\/app\/(.*\/)?error\.(tsx|ts)$/,
  /^src\/app\/global-error\.(tsx|ts)$/,
  /^src\/proxy\.(ts|js)$/,
];

const STORE_NAMES = [
  "useAuthStore",
  "useLibraryStore",
  "useDesignerStore",
  "useSettingsStore",
  "useShareStore",
  "useOrganizerStore",
  "useDialogStore",
  "usePlaybookPrintConfigStore",
];

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, acc);
    } else if (SOURCE_EXTS.includes(path.extname(entry.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

function resolveImport(fromAbs, spec) {
  let target = null;
  if (spec.startsWith("@/")) {
    target = path.join(SRC, spec.slice(2).replace(/\//g, path.sep));
  } else if (spec.startsWith(".")) {
    target = path.resolve(path.dirname(fromAbs), spec);
  } else {
    return { kind: "external", spec };
  }

  const candidates = [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}.js`,
    `${target}.jsx`,
    path.join(target, "index.ts"),
    path.join(target, "index.tsx"),
    path.join(target, "index.js"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return { kind: "internal", path: toPosix(path.relative(ROOT, c)) };
    }
  }
  return { kind: "unresolved", spec };
}

function parseImports(fileAbs) {
  const text = fs.readFileSync(fileAbs, "utf8");
  const specs = new Set();
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(text)) !== null) {
    const spec = m[1] ?? m[2];
    if (spec) specs.add(spec);
  }
  return [...specs];
}

function layerOf(relPath) {
  const p = relPath.replace(/\\/g, "/");
  if (p.startsWith("src/app/")) return "app";
  if (p.startsWith("src/components/")) return "components";
  if (p.startsWith("src/lib/")) return "lib";
  if (p.startsWith("src/stores/")) return "stores";
  if (p.startsWith("src/hooks/")) return "hooks";
  if (p.startsWith("src/types/")) return "types";
  if (p.startsWith("src/styles/")) return "styles";
  return "other";
}

function isEntry(relPath) {
  const p = relPath.replace(/\\/g, "/");
  return ENTRY_PATTERNS.some((re) => re.test(p));
}

function routeFromAppFile(relPath) {
  const p = relPath.replace(/\\/g, "/");
  if (!p.startsWith("src/app/")) return null;
  const parts = p
    .slice("src/app/".length)
    .split("/")
    .filter((seg) => !seg.match(/^(page|layout|route|error)\.(tsx|ts)$/))
    .filter((seg) => !seg.startsWith("(") || !seg.endsWith(")"))
    .filter(Boolean);
  return "/" + parts.join("/");
}

function detectCycles(graph) {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function dfs(node) {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      if (idx >= 0) cycles.push([...stack.slice(idx), node]);
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      dfs(dep);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cycles.slice(0, 10);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allFiles = walk(SRC).map((f) => toPosix(path.relative(ROOT, f)));
const fileSet = new Set(allFiles);

const importsByFile = new Map();
const importedBy = new Map();
const externalUsage = new Map();
const unresolved = [];
const layerEdges = new Map();
const storeUsage = Object.fromEntries(STORE_NAMES.map((s) => [s, []]));

for (const rel of allFiles) {
  const abs = path.join(ROOT, rel);
  const specs = parseImports(abs);
  const resolved = [];

  const text = fs.readFileSync(abs, "utf8");
  for (const store of STORE_NAMES) {
    if (text.includes(store)) storeUsage[store].push(rel);
  }

  for (const spec of specs) {
    const r = resolveImport(abs, spec);
    if (r.kind === "internal" && fileSet.has(r.path)) {
      resolved.push(r.path);
      importedBy.set(r.path, [...(importedBy.get(r.path) ?? []), rel]);

      const fromLayer = layerOf(rel);
      const toLayer = layerOf(r.path);
      const key = `${fromLayer}->${toLayer}`;
      layerEdges.set(key, (layerEdges.get(key) ?? 0) + 1);
    } else if (r.kind === "external") {
      const pkg = r.spec.startsWith("@")
        ? r.spec.split("/").slice(0, 2).join("/")
        : r.spec.split("/")[0];
      externalUsage.set(pkg, (externalUsage.get(pkg) ?? 0) + 1);
    } else if (r.kind === "unresolved" && (spec.startsWith("@/") || spec.startsWith("."))) {
      unresolved.push({ file: rel, spec });
    }
  }

  importsByFile.set(rel, resolved);
}

// Reachable from entry points
const reachable = new Set();
const queue = allFiles.filter(isEntry);
for (const e of queue) reachable.add(e);

while (queue.length) {
  const cur = queue.shift();
  for (const dep of importsByFile.get(cur) ?? []) {
    if (!reachable.has(dep)) {
      reachable.add(dep);
      queue.push(dep);
    }
  }
}

const orphans = allFiles
  .filter((f) => !isEntry(f) && !reachable.has(f))
  .sort();

const importCounts = new Map();
for (const [, deps] of importsByFile) {
  for (const d of deps) importCounts.set(d, (importCounts.get(d) ?? 0) + 1);
}
const topImported = [...importCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([file, count]) => ({ file, count, importedBy: (importedBy.get(file) ?? []).length }));

const routes = allFiles
  .filter((f) => f.includes("/app/") && /\/(page|route)\.(tsx|ts)$/.test(f))
  .map((f) => ({
    file: f,
    url: routeFromAppFile(f) || "/",
    type: f.endsWith("route.ts") || f.endsWith("route.tsx") ? "api" : "page",
  }))
  .sort((a, b) => a.url.localeCompare(b.url));

const graph = new Map();
for (const [from, deps] of importsByFile) graph.set(from, deps);
const cycles = detectCycles(graph);

function dirHasAnyFiles(dirAbs) {
  if (!fs.existsSync(dirAbs)) return false;
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.isFile()) return true;
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      if (dirHasAnyFiles(path.join(dirAbs, entry.name))) return true;
    }
  }
  return false;
}

const emptyDirs = [];
function walkDirs(dir, rel = "") {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const childAbs = path.join(dir, entry.name);
    if (!dirHasAnyFiles(childAbs)) emptyDirs.push(childRel);
    walkDirs(childAbs, childRel);
  }
}
walkDirs(ROOT);

const report = {
  sourceFiles: allFiles.length,
  entryPoints: allFiles.filter(isEntry).length,
  reachableFromEntries: reachable.size,
  orphans,
  orphanCount: orphans.length,
  topImported,
  externalPackages: [...externalUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pkg, count]) => ({ pkg, count })),
  layerCoupling: [...layerEdges.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([edge, count]) => ({ edge, count })),
  storeUsage: Object.fromEntries(
    STORE_NAMES.map((s) => [s, { files: storeUsage[s].length, paths: storeUsage[s] }]),
  ),
  routes,
  unresolvedImports: unresolved,
  circularDependencies: cycles.map((c) => c.join(" -> ")),
  emptyDirectories: emptyDirs.filter((d) => !d.startsWith("node_modules")),
};

process.stdout.write(JSON.stringify(report, null, 2));
