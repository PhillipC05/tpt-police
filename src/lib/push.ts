import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? "admin@tptpolice.gov"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Send push to every subscribed device in a tenant. */
export async function sendPushToTenant(tenantId: string, payload: PushPayload) {
  if (!isPushConfigured()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { tenantId } });
  await Promise.allSettled(subs.map((s) => deliver(s, payload)));
}

/** Send push to every subscribed device of a single user. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!isPushConfigured()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(subs.map((s) => deliver(s, payload)));
}

async function deliver(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        ...payload,
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
      }),
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      // Subscription expired — prune silently
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      logger.warn("Push delivery failed", { endpoint: sub.endpoint, err });
    }
  }
}
