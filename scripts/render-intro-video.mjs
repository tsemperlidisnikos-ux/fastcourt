#!/usr/bin/env node
/**
 * Render FastCourt intro video from scripts/intro/fastcourt-intro.html
 *
 * Usage:
 *   node scripts/render-intro-video.mjs
 *   node scripts/render-intro-video.mjs --duration=15
 *   node scripts/render-intro-video.mjs --preview   (open HTML in browser)
 *
 * Output:
 *   public/assets/branding/intro/fastcourt-intro.webm
 *   public/assets/branding/intro/fastcourt-intro.mp4  (if ffmpeg available)
 */

import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTRO_HTML = path.join(ROOT, "scripts", "intro", "fastcourt-intro.html");
const OUT_DIR = path.join(ROOT, "public", "assets", "branding", "intro");
const WEBM_OUT = path.join(OUT_DIR, "fastcourt-intro.webm");
const MP4_OUT = path.join(OUT_DIR, "fastcourt-intro.mp4");
const WIDTH = 1920;
const HEIGHT = 1080;

const durationArg = process.argv.find((a) => a.startsWith("--duration="));
const PREVIEW = process.argv.includes("--preview");
const DURATION_MS = durationArg
  ? Math.max(2000, Number(durationArg.split("=")[1]) * 1000)
  : 18000;

function readHtmlDurationMs() {
  const html = fs.readFileSync(INTRO_HTML, "utf8");
  const match = html.match(/name="fastcourt-intro-duration-ms"\s+content="(\d+)"/);
  return match ? Math.max(2000, Number(match[1])) : DURATION_MS;
}

function findFfmpeg() {
  const local = path.join(ROOT, "node_modules", "@ffmpeg-installer", "win32-x64", "ffmpeg.exe");
  if (fs.existsSync(local)) return local;
  const probe = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (probe.status === 0) return "ffmpeg";
  return null;
}

async function renderWebm() {
  const captureMs = durationArg ? DURATION_MS : readHtmlDurationMs();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpVideoDir = path.join(OUT_DIR, ".capture");
  fs.mkdirSync(tmpVideoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: tmpVideoDir,
      size: { width: WIDTH, height: HEIGHT },
    },
  });

  const page = await context.newPage();
  const fileUrl = `file:///${INTRO_HTML.replace(/\\/g, "/")}`;
  await page.goto(fileUrl, { waitUntil: "load" });
  await page.waitForFunction(
    () => document.querySelectorAll(".feature-shot").length >= 3,
    undefined,
    { timeout: 10000 },
  );
  await page.waitForFunction(
    () => window.__INTRO_DONE__ === true,
    undefined,
    { timeout: captureMs + 5000 },
  );
  await page.waitForTimeout(300);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (!video) throw new Error("Playwright did not record a video.");

  const captured = await video.path();
  if (fs.existsSync(WEBM_OUT)) fs.unlinkSync(WEBM_OUT);
  fs.renameSync(captured, WEBM_OUT);

  for (const f of fs.readdirSync(tmpVideoDir)) {
    fs.unlinkSync(path.join(tmpVideoDir, f));
  }
  fs.rmdirSync(tmpVideoDir);

  return WEBM_OUT;
}

function convertToMp4(webmPath) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) return null;

  const args = [
    "-y",
    "-i",
    webmPath,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-crf",
    "18",
    "-preset",
    "medium",
    MP4_OUT,
  ];
  const result = spawnSync(ffmpeg, args, { encoding: "utf8" });
  if (result.status !== 0) {
    console.warn("[intro] MP4 conversion failed:", result.stderr?.slice(0, 400));
    return null;
  }
  return MP4_OUT;
}

async function main() {
  if (!fs.existsSync(INTRO_HTML)) {
    throw new Error(`Missing intro HTML: ${INTRO_HTML}`);
  }

  if (PREVIEW) {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    const fileUrl = `file:///${INTRO_HTML.replace(/\\/g, "/")}`;
    await page.goto(fileUrl, { waitUntil: "load" });
    console.log("[intro] Preview open — close the browser window when done.");
    await page.waitForEvent("close", { timeout: 0 }).catch(() => undefined);
    await browser.close();
    return;
  }

  const captureMs = durationArg ? DURATION_MS : readHtmlDurationMs();
  console.log(`[intro] Capturing ${(captureMs / 1000).toFixed(1)}s at ${WIDTH}x${HEIGHT}...`);
  const webm = await renderWebm();
  const webmMb = (fs.statSync(webm).size / (1024 * 1024)).toFixed(2);
  console.log(`[intro] Saved ${webm} (${webmMb} MB)`);

  console.log("[intro] Converting to mp4...");
  const mp4 = convertToMp4(webm);
  if (mp4) {
    const mp4Mb = (fs.statSync(mp4).size / (1024 * 1024)).toFixed(2);
    console.log(`[intro] Saved ${mp4} (${mp4Mb} MB)`);
  } else {
    console.log("[intro] ffmpeg not found — webm only. Install ffmpeg or @ffmpeg-installer/ffmpeg for mp4.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
