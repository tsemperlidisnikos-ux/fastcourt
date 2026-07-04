#!/usr/bin/env node
/**
 * Generate printable QA checklists:
 *   docs/qa/excel/FastCourt-QA-Master.csv
 *   docs/qa/excel/FastCourt-QA-{module}.csv
 *   docs/qa/FastCourt-QA-Checklists.html  (Print → Save as PDF)
 *
 * Usage: node scripts/generate-qa-checklists.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QA_META, QA_MODULES } from "./qa-checklist-data.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs", "qa");
const EXCEL_DIR = path.join(OUT_DIR, "excel");

const CSV_HEADERS = [
  "Module",
  "Section",
  "Check ID",
  "Priority",
  "Check Item",
  "Steps",
  "Expected Result",
  "Pass (Y/N/NA)",
  "Notes",
  "Tester",
  "Date",
  "Environment",
];

function escapeCsv(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowToCsv(cells) {
  return cells.map(escapeCsv).join(",");
}

function flattenRows() {
  /** @type {string[][]} */
  const rows = [];
  for (const mod of QA_MODULES) {
    for (const section of mod.sections) {
      for (const item of section.items) {
        rows.push([
          mod.title,
          section.title,
          item.id,
          item.priority ?? "P2",
          item.item,
          item.steps ?? "",
          item.expected ?? "",
          "",
          "",
          "",
          "",
          "",
        ]);
      }
    }
  }
  return rows;
}

function writeCsv(filePath, dataRows) {
  const lines = [rowToCsv(CSV_HEADERS), ...dataRows.map(rowToCsv)];
  const body = lines.join("\r\n");
  // UTF-8 BOM for Excel Greek/Unicode on Windows
  fs.writeFileSync(filePath, `\uFEFF${body}`, "utf8");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildHtml(rows) {
  const generated = new Date().toLocaleString("el-GR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const moduleBlocks = QA_MODULES.map((mod) => {
    const sections = mod.sections
      .map((section) => {
        const tableRows = section.items
          .map(
            (item) => `
          <tr>
            <td class="id">${item.id}</td>
            <td class="pri ${(item.priority ?? "P2").toLowerCase()}">${item.priority ?? "P2"}</td>
            <td>${escapeHtml(item.item)}</td>
            <td class="steps">${escapeHtml(item.steps ?? "—")}</td>
            <td class="expected">${escapeHtml(item.expected ?? "—")}</td>
            <td class="pass"></td>
            <td class="notes"></td>
          </tr>`,
          )
          .join("");
        return `
        <h3>${escapeHtml(section.title)}</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Pri</th>
              <th>Check</th>
              <th>Steps</th>
              <th>Expected</th>
              <th>Pass</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>`;
      })
      .join("");

    return `
    <section class="module">
      <h2>${escapeHtml(mod.title)}</h2>
      ${sections}
    </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(QA_META.product)} — QA Checklists</title>
  <style>
    :root {
      --ink: #111;
      --muted: #555;
      --line: #ccc;
      --p0: #b91c1c;
      --p1: #b45309;
      --p2: #475569;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: var(--ink);
      margin: 0;
      padding: 16px 18px 32px;
    }
    .cover {
      page-break-after: always;
      padding: 24px 0 40px;
      border-bottom: 3px solid var(--ink);
      margin-bottom: 24px;
    }
    .cover h1 { font-size: 28px; margin: 0 0 8px; }
    .cover p { margin: 4px 0; color: var(--muted); }
    .legend { margin-top: 16px; font-size: 10px; }
    .legend span { margin-right: 14px; }
    .pri.p0 { color: var(--p0); font-weight: 700; }
    .pri.p1 { color: var(--p1); font-weight: 700; }
    .pri.p2 { color: var(--p2); }
    h2 {
      font-size: 16px;
      margin: 28px 0 10px;
      padding-bottom: 4px;
      border-bottom: 2px solid var(--ink);
      page-break-after: avoid;
    }
    h3 {
      font-size: 12px;
      margin: 16px 0 6px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      page-break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td {
      border: 1px solid var(--line);
      padding: 5px 6px;
      vertical-align: top;
      text-align: left;
    }
    th {
      background: #f3f4f6;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td.id { width: 52px; font-weight: 700; white-space: nowrap; }
    td.pri { width: 28px; text-align: center; }
    td.pass { width: 36px; }
    td.notes { width: 80px; min-height: 18px; }
    td.steps, td.expected { font-size: 10px; color: var(--muted); }
    .no-print {
      position: sticky;
      top: 0;
      background: #111;
      color: #fff;
      padding: 10px 14px;
      margin: -16px -18px 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      z-index: 10;
    }
    .no-print button {
      background: #2563eb;
      color: #fff;
      border: 0;
      padding: 8px 14px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; font-size: 9px; }
      @page { margin: 12mm; size: A4 landscape; }
      h2 { margin-top: 18px; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <strong>${escapeHtml(QA_META.product)} QA Checklists</strong>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <span style="opacity:0.8;font-size:11px">Tip: Enable "Background graphics" for colors</span>
  </div>

  <div class="cover">
    <h1>${escapeHtml(QA_META.product)} — QA Checklists</h1>
    <p><strong>Version:</strong> ${escapeHtml(QA_META.version)} · <strong>Generated:</strong> ${escapeHtml(generated)}</p>
    <p><strong>Production:</strong> ${escapeHtml(QA_META.productionUrl)}</p>
    <p>${escapeHtml(QA_META.generatedNote)}</p>
    <div class="legend">
      <span><strong>P0</strong> = Critical / smoke</span>
      <span><strong>P1</strong> = Important regression</span>
      <span><strong>P2</strong> = Secondary</span>
    </div>
    <p style="margin-top:20px"><strong>Total checks:</strong> ${rows.length}</p>
  </div>

  ${moduleBlocks}
</body>
</html>`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function main() {
  fs.mkdirSync(EXCEL_DIR, { recursive: true });

  const allRows = flattenRows();

  writeCsv(path.join(EXCEL_DIR, "FastCourt-QA-Master.csv"), allRows);

  for (const mod of QA_MODULES) {
    const modRows = allRows.filter((row) => row[0] === mod.title);
    const fileName = `FastCourt-QA-${slugify(mod.id)}.csv`;
    writeCsv(path.join(EXCEL_DIR, fileName), modRows);
  }

  const htmlPath = path.join(OUT_DIR, "FastCourt-QA-Checklists.html");
  fs.writeFileSync(htmlPath, buildHtml(allRows), "utf8");

  const readmePath = path.join(OUT_DIR, "README.txt");
  fs.writeFileSync(
    readmePath,
    [
      "FastCourt QA Checklists",
      "=====================",
      "",
      "Excel:",
      "  Open docs/qa/excel/FastCourt-QA-Master.csv in Excel",
      "  (UTF-8 with BOM — Greek/English supported)",
      "  Per-module CSVs also available in docs/qa/excel/",
      "",
      "PDF:",
      "  Open docs/qa/FastCourt-QA-Checklists.html in Chrome/Edge",
      "  Click 'Print / Save as PDF' (landscape recommended)",
      "",
      "Regenerate after app changes:",
      "  npm run qa:checklists",
      "",
      `Checks: ${allRows.length}`,
      `Version: ${QA_META.version}`,
    ].join("\r\n"),
    "utf8",
  );

  console.log(`Generated ${allRows.length} checks`);
  console.log(`  ${path.relative(ROOT, path.join(EXCEL_DIR, "FastCourt-QA-Master.csv"))}`);
  console.log(`  ${path.relative(ROOT, htmlPath)}`);
  console.log(`  ${QA_MODULES.length} module CSV files in docs/qa/excel/`);
}

main();
