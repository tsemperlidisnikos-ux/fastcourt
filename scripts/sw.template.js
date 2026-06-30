/* FastCourt service worker — generated; do not edit public/sw.js directly. */
/* eslint-disable no-restricted-globals */

const BUILD = "__BUILD__";
const SHELL_CACHE = `fastcourt-shell-${BUILD}`;
const STATIC_CACHE = `fastcourt-static-${BUILD}`;

const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/assets/landing/fastcourt-intro-mark.png",
  "/icons/fastcourt-logo.png",
  "/assets/courts/oak-veneered-mdf.jpg?v=3",
  "/assets/courts/accoya-planed-all-round-66.jpg?v=3",
];

function isSameOrigin(url) {
  try {
    return new URL(url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isStaticAssetPath(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    /\.(?:woff2?|png|jpe?g|webp|svg|ico|css|js|mjs|webmanifest)$/i.test(pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || network || Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    if (offline) return offline;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("fastcourt-") &&
              key !== SHELL_CACHE &&
              key !== STATIC_CACHE,
          )
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request.url)) return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAssetPath(url.pathname)) {
    event.respondWith(
      url.pathname.startsWith("/_next/static/")
        ? cacheFirst(request, STATIC_CACHE)
        : staleWhileRevalidate(request),
    );
  }
});
