const CACHE_NAME = "nagovori-shell-v2";
const OFFLINE_NOTEBOOK_URL = "/offline-notebook.html";
const SHELL_URLS = [
  OFFLINE_NOTEBOOK_URL,
  "/manifest.webmanifest",
  "/brand/nagovori-mark.svg",
  "/brand/nagovori-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status < 500) return response;
          return caches.match(OFFLINE_NOTEBOOK_URL).then((fallback) => fallback || response);
        })
        .catch(() => caches.match(OFFLINE_NOTEBOOK_URL)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
