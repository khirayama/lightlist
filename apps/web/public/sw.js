const CACHE_NAME = "lightlist-static-__BUILD_ID__";

const isCacheableStaticRequest = (request) => {
  const url = new URL(request.url);
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/fonts/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/brand/") ||
      url.pathname === "/manifest.webmanifest" ||
      url.pathname === "/theme.js" ||
      url.pathname === "/font-loader.js")
  );
};

const cacheResponse = (request, response) => {
  if (!response.ok) return;
  try {
    const responseCopy = response.clone();
    void caches
      .open(CACHE_NAME)
      .then((cache) => cache.put(request, responseCopy))
      .catch(() => {});
  } catch {
    return;
  }
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cacheResponse(request, response);
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ??
              new Response("Lightlist is unavailable offline.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              }),
          ),
        ),
    );
    return;
  }

  if (!isCacheableStaticRequest(request)) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        cacheResponse(request, response);
        return response;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event?.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
