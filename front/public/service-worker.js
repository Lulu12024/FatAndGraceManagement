/* FATE & GRÂCE — Service Worker v2.0 — avec Push Notifications */
const CACHE = "fg-pwa-v2";
const PRECACHE = ["/", "/index.html", "/manifest.json"];

// ── Installation ──────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

// ── Activation ───────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch : cache stratégie ───────────────────────────────
self.addEventListener("fetch", (e) => {
  // Ne jamais cacher les appels API ni les WebSocket
  if (e.request.url.includes("/api/") || e.request.url.startsWith("ws")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});

// ── Push Notifications ────────────────────────────────────
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data?.json() ?? {};
  } catch (_) {
    data = { title: "FATE & GRÂCE", body: e.data?.text() || "" };
  }

  const title = data.title || "FATE & GRÂCE";
  const options = {
    body:    data.body  || "",
    icon:    "/icon-192x192.png",
    badge:   "/icon-192x192.png",
    tag:     data.tag   || "fg-notif",          // regrouper les notifs du même type
    renotify: true,                              // vibrer même si même tag
    data:    { url: data.url || "/" },
    vibrate: [200, 100, 200],
    actions: data.actions || [],                 // boutons d'action optionnels
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Clic sur notification → ouvrir/focus l'app ───────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || "/";

  e.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        // Si l'app est déjà ouverte, on la focus
        const existing = list.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        // Sinon on l'ouvre
        return clients.openWindow(targetUrl);
      })
  );
});