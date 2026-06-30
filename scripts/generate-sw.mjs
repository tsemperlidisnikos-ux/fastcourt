import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const build = (process.env.NEXT_PUBLIC_APP_BUILD ?? "dev").replace(
  /[^a-zA-Z0-9_-]/g,
  "-",
);
const template = readFileSync(
  join(import.meta.dirname, "sw.template.js"),
  "utf8",
);
const output = template.replaceAll("__BUILD__", build);

writeFileSync(join(root, "public", "sw.js"), output, "utf8");
console.log(`[FastCourt] Generated public/sw.js (build: ${build})`);
