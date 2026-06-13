import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const source = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const target = join(root, "public", "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.warn("[FastCourt] pdfjs-dist worker not found — skip copy (run npm ci first).");
  process.exit(0);
}

copyFileSync(source, target);
console.log("[FastCourt] Synced public/pdf.worker.min.mjs from pdfjs-dist");
