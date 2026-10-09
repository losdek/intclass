/**
 * intclass Service Worker — Offline Caching & Instant Loading
 */
const CACHE_NAME = "intclass-v5";
const STATIC_ASSETS = [
  "./",
  "index.html",
  "lessons/",
  "lessons/index.html",
  "css/style.css",
  "js/main.js",
  "js/lessons.js",
  "404.html",
  "manifest.webmanifest"
];

// Install Event: Pre-cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate for app assets, network-first for navigation
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== location.origin) {
    return;
  }

  // Lesson videos stream straight from the network: the browser needs HTTP range requests
  // for seeking, and caching every MP4 would fill the offline cache with tens of megabytes
  if (url.pathname.endsWith(".mp4") || request.headers.has("range")) {
    return;
  }

  // Navigation requests: Network first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match("index.html");
        })
    );
    return;
  }

  // Static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
