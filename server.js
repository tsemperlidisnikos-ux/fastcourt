const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { existsSync } = require("fs");
const { join } = require("path");

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);
// Plesk startup file — always serve the production build (never `next dev`).
const dev = false;

const buildIdPath = join(__dirname, ".next", "BUILD_ID");
if (!existsSync(buildIdPath)) {
  console.error(
    "[FastCourt] Missing production build. Run `npm ci && npm run build` before starting server.js.",
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (
  !supabaseUrl ||
  !supabaseKey ||
  supabaseUrl.includes("YOUR_PROJECT") ||
  supabaseKey.includes("YOUR_ANON_KEY")
) {
  console.warn(
    "[FastCourt] Supabase env vars are missing or still placeholders. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Plesk, " +
      "then run `npm run build` again so they are embedded in the client bundle.",
  );
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  }).listen(port, hostname, () => {
    console.log(`FastCourt ready on http://${hostname}:${port}`);
  });
});
