"use client";

import { useEffect } from "react";

// Registers the shared service worker for the public portal (no push subscription).
export function PublicServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {});
  }, []);

  return null;
}
