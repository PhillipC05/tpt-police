// TPT Police — Service Worker
// Handles: push notifications, background sync, offline caching

const CACHE = "tpt-v1";
const STATIC_ASSETS = [
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// ── Install: pre-cache static assets ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// ── Activate: prune old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// ── Fetch: cache-first for icons, network-first for everything else ───────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache-first: static icon assets
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached ?? fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
          return res;
        }),
      ),
    );
    return;
  }

  // Network-only for API routes (no stale data risk)
  if (url.pathname.startsWith("/api/")) return;

  // Network-first with cache fallback for navigation
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)),
    );
  }
});

// ── Push: show notification ───────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "TPT Police", body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    tag: payload.tag ?? "tpt-notification",
    data: { url: payload.url ?? "/dashboard" },
    vibrate: [200, 100, 200],
    requireInteraction: payload.requireInteraction ?? false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options),
  );
});

// ── Notification click: focus or open the target URL ─────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const existing = cs.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        return existing.navigate(target);
      }
      return self.clients.openWindow(target);
    }),
  );
});

// ── Background Sync: process queued field contacts and panics ─────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "field-contact-sync") {
    event.waitUntil(syncFieldContacts());
  } else if (event.tag === "panic-sync") {
    event.waitUntil(syncPanics());
  }
});

async function syncFieldContacts() {
  const db = await openOfflineDB();
  const items = await getAllFromStore(db, "field-contacts");
  for (const item of items) {
    try {
      const res = await fetch("/api/field-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await deleteFromStore(db, "field-contacts", item.id);
      }
    } catch {
      // Will retry on next sync
    }
  }
}

async function syncPanics() {
  const db = await openOfflineDB();
  const items = await getAllFromStore(db, "panics");
  for (const item of items) {
    try {
      const res = await fetch("/api/panic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        await deleteFromStore(db, "panics", item.id);
      }
    } catch {
      // Will retry on next sync
    }
  }
}

// ── Minimal IndexedDB helpers (service worker context) ───────────────────────
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("tpt-offline", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("field-contacts")) {
        db.createObjectStore("field-contacts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("panics")) {
        db.createObjectStore("panics", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db, store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
