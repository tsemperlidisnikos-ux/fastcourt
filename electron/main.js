const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

/** Production site; override with FASTCOURT_URL=http://localhost:3000 for local testing. */
const APP_ORIGIN = (process.env.FASTCOURT_URL || "https://fastcourt.eu").replace(/\/$/, "");
const START_PATH = process.env.FASTCOURT_START_PATH || "/library";

let mainWindow;

function isAllowedNavigation(url) {
  try {
    return new URL(url).origin === new URL(APP_ORIGIN).origin;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "FastCourt",
    icon: path.join(__dirname, "..", "public", "assets", "landing", "fastcourt-intro-mark.png"),
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(`${APP_ORIGIN}${START_PATH}`);

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

  app.whenReady().then(createWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
