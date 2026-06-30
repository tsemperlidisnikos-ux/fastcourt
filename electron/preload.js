/** Minimal preload — no Node APIs exposed to the FastCourt web app. */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("fastcourtDesktop", {
  version: process.env.npm_package_version || "0.1.0",
});
