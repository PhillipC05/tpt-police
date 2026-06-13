"use client";

export function setBadge(count: number) {
  if ("setAppBadge" in navigator) {
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}

export function clearBadge() {
  if ("clearAppBadge" in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
}
