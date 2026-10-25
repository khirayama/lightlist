const CACHE_NAME = "lightlist-static-__BUILD_ID__";
const NAVIGATION_TIMEOUT_MS = 3000;

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
    const url = new URL(request.url);
    const cacheKey = `${url.origin}${url.pathname}`;
    const network = fetch(request).then((response) => {
      cacheResponse(cacheKey, response);
      return response;
    });
    const offlineResponse = () =>
      new Response("Lightlist is unavailable offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    event.respondWith(
      new Promise((resolve) => {
        let settled = false;
        const settle = (response) => {
          if (settled) return;
          settled = true;
          resolve(response);
        };
        const timer = setTimeout(() => {
          caches.match(cacheKey).then((cached) => {
            if (cached) settle(cached);
          });
        }, NAVIGATION_TIMEOUT_MS);
        network
          .then((response) => {
            clearTimeout(timer);
            settle(response);
          })
          .catch(() => {
            clearTimeout(timer);
            caches
              .match(cacheKey)
              .then((cached) => settle(cached ?? offlineResponse()));
          });
      }),
    );
    event.waitUntil(network.catch(() => {}));
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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }
  const notification = payload.notification ?? {};
  const taskListId = payload.data?.taskListId;
  event.waitUntil(
    self.registration.showNotification(notification.title ?? "Lightlist", {
      body: notification.body ?? "",
      tag: notification.tag ?? taskListId,
      data: { taskListId },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const taskListId = event.notification.data?.taskListId;
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const appClient = clients.find((client) => {
          const url = new URL(client.url);
          return (
            url.origin === self.location.origin &&
            url.pathname.startsWith("/app/")
          );
        });
        if (!appClient) {
          return self.clients.openWindow(
            taskListId
              ? `/app/?taskListId=${encodeURIComponent(taskListId)}`
              : "/app/",
          );
        }
        if (taskListId) {
          appClient.postMessage({
            type: "lightlist-open-task-list",
            taskListId,
          });
        }
        return appClient.focus();
      }),
  );
});
