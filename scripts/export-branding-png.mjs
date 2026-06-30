import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brandingDir = path.join(root, "public", "assets", "branding");
const outDir = path.join(brandingDir, "png");

/** FastDraw-style: italic Fast + Court, orange/white split. */
const drawExports = [
  { file: "fastcourt-draw-wordmark.svg", width: 1280 },
  { file: "fastcourt-draw-wordmark-light.svg", width: 1280 },
  { file: "fastcourt-draw-lockup.svg", width: 1280 },
  { file: "fastcourt-draw-login.svg", width: 800 },
  { file: "fastcourt-draw-mark.svg", width: 512 },
];

const fdExports = [
  { file: "fastcourt-fd-wordmark-white.svg", width: 1280 },
  { file: "fastcourt-fd-wordmark-blue.svg", width: 1280 },
  { file: "fastcourt-fd-lockup-white.svg", width: 1280 },
  { file: "fastcourt-fd-stacked-white.svg", width: 960 },
  { file: "fastcourt-fd-mark-fc-white.svg", width: 512 },
  { file: "fastcourt-fd-icon-blue.svg", width: 512 },
  { file: "fastcourt-fd-login-white.svg", width: 1280 },
  { file: "fastcourt-fd-header-bar.svg", width: 1280 },
];

const legacyExports = [
  { file: "fastcourt-mark-court.svg", width: 512 },
  { file: "fastcourt-lockup-primary.svg", width: 1280 },
  { file: "fastcourt-mark-monogram.svg", width: 512 },
  { file: "fastcourt-mark-hoop.svg", width: 512 },
  { file: "fastcourt-mark-diamond.svg", width: 512 },
  { file: "fastcourt-mark-speed.svg", width: 512 },
  { file: "fastcourt-lockup-stacked.svg", width: 1280 },
  { file: "fastcourt-lockup-minimal.svg", width: 1280 },
  { file: "fastcourt-european-mark.svg", width: 512 },
  { file: "fastcourt-european-lockup.svg", width: 1280 },
  { file: "fastcourt-european-header.svg", width: 1280 },
];

const exports = [...drawExports, ...fdExports, ...legacyExports];

fs.mkdirSync(outDir, { recursive: true });

for (const item of exports) {
  const input = path.join(brandingDir, item.file);
  const base = item.file.replace(/\.svg$/i, "");
  const output = path.join(outDir, `${base}.png`);

  if (!fs.existsSync(input)) {
    console.warn(`Skip missing: ${item.file}`);
    continue;
  }

  execFileSync(
    "npx",
    [
      "--yes",
      "@resvg/resvg-js-cli",
      "--fit-width",
      String(item.width),
      input,
      output,
    ],
    { cwd: root, stdio: "inherit", shell: true },
  );

  const stat = fs.statSync(output);
  console.log(`OK ${base}.png (${(stat.size / 1024).toFixed(1)} KB)`);
}

console.log(`\nExported to public/assets/branding/png/`);

const iconsDir = path.join(root, "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });
const wordmarkPng = path.join(outDir, "fastcourt-draw-wordmark.png");
const iconPng = path.join(outDir, "fastcourt-draw-mark.png");
if (fs.existsSync(wordmarkPng)) {
  fs.copyFileSync(wordmarkPng, path.join(iconsDir, "fastcourt-logo.png"));
  console.log("Updated public/icons/fastcourt-logo.png (horizontal wordmark)");
}
if (fs.existsSync(iconPng)) {
  fs.copyFileSync(iconPng, path.join(iconsDir, "fastcourt-logo-icon.png"));
}
