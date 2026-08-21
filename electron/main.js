const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");
const net = require("net");

const START_PATH = process.env.FASTCOURT_START_PATH || "/library";
const PREFERRED_PORT = Number(process.env.FASTCOURT_PORT || 3911);

/** Production site fallback when no local standalone server is bundled. */
const REMOTE_ORIGIN = (
  process.env.FASTCOURT_URL || "https://fastcourt.eu"
).replace(/\/$/, "");

let mainWindow = null;
let localServer = null;
let localOrigin = null;

function resolveStandaloneServerJs() {
  const dirs = [];
  if (process.resourcesPath) {
    dirs.push(path.join(process.resourcesPath, "app"));
  }
  // Dev / unpackaged: after `npm run build`
  dirs.push(path.join(__dirname, "..", ".next", "standalone"));

  for (const dir of dirs) {
    const direct = path.join(dir, "server.js");
    if (fs.existsSync(direct)) return direct;
    try {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
      for (const name of fs.readdirSync(dir)) {
        const nested = path.join(dir, name, "server.js");
        if (fs.existsSync(nested)) return nested;
      }
    } catch {
      // skip
    }
  }
  return null;
}

function useLocalServer() {
  if (process.env.FASTCOURT_URL) return false;
  if (process.env.FASTCOURT_USB === "0") return false;
  if (process.env.FASTCOURT_USB === "1") return true;
  return Boolean(resolveStandaloneServerJs());
}

function isAllowedNavigation(url) {
  try {
    const origin = new URL(url).origin;
    if (localOrigin && origin === localOrigin) return true;
    return origin === new URL(REMOTE_ORIGIN).origin;
  } catch {
    return false;
  }
}

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => {
        if (port >= startPort + 40) {
          reject(new Error("No free port for FastCourt local server"));
          return;
        }
        tryPort(port + 1);
      });
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    };
    tryPort(startPort);
  });
}

function waitForServer(origin, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`${origin}/`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error("Local FastCourt server did not start in time"));
          return;
        }
        setTimeout(tick, 250);
      });
      req.setTimeout(1500, () => {
        req.destroy();
      });
    };
    tick();
  });
}

async function startLocalServer() {
  const serverJs = resolveStandaloneServerJs();
  if (!serverJs) {
    throw new Error("Standalone server.js not found. Run npm run build first.");
  }

  const port = await findFreePort(PREFERRED_PORT);
  const cwd = path.dirname(serverJs);
  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    ELECTRON_RUN_AS_NODE: "1",
  };

  localServer = spawn(process.execPath, [serverJs], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  localServer.stdout?.on("data", (chunk) => {
    if (process.env.FASTCOURT_DEBUG) {
      process.stdout.write(`[fc-server] ${chunk}`);
    }
  });
  localServer.stderr?.on("data", (chunk) => {
    process.stderr.write(`[fc-server] ${chunk}`);
  });
  localServer.on("exit", (code) => {
    localServer = null;
    if (code && code !== 0 && mainWindow) {
      console.error(`[FastCourt] Local server exited with code ${code}`);
    }
  });

  localOrigin = `http://127.0.0.1:${port}`;
  await waitForServer(localOrigin);
  return localOrigin;
}

function stopLocalServer() {
  if (!localServer || localServer.killed) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(localServer.pid), "/f", "/t"], {
        windowsHide: true,
        stdio: "ignore",
      });
    } else {
      localServer.kill("SIGTERM");
    }
  } catch {
    // ignore
  }
  localServer = null;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "FastCourt",
    icon: path.join(
      __dirname,
      "..",
      "public",
      "assets",
      "landing",
      "fastcourt-intro-mark.png",
    ),
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  let origin = REMOTE_ORIGIN;
  if (useLocalServer()) {
    try {
      origin = await startLocalServer();
    } catch (err) {
      console.error("[FastCourt] Local USB/portable server failed:", err);
      origin = REMOTE_ORIGIN;
    }
  }

  mainWindow.loadURL(`${origin}${START_PATH}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    void createWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });

  app.on("before-quit", () => {
    stopLocalServer();
  });

  app.on("window-all-closed", () => {
    stopLocalServer();
    if (process.platform !== "darwin") app.quit();
  });
}
