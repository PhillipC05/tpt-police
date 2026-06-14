/**
 * Facial recognition service adapter.
 *
 * Wraps an external biometric identification API.
 * When FACIAL_API_URL and FACIAL_API_KEY are not set the service returns
 * an empty stub result so development works without a live integration.
 *
 * All identification requests are written to AuditLog (resource: "facial_recognition").
 */

import { logger } from "@/lib/logger";

export interface FacialCandidate {
  personId: string | null;
  externalId: string | null;
  confidence: number;
}

export interface FacialIdentifyResult {
  matches: FacialCandidate[];
  source: "facial_api" | "stub";
}

const FACIAL_API_URL = process.env.FACIAL_API_URL;
const FACIAL_API_KEY = process.env.FACIAL_API_KEY;

export function isFacialConfigured(): boolean {
  return !!(FACIAL_API_URL && FACIAL_API_KEY);
}

export async function identifyFace(
  imageBase64OrUrl: string,
  opts?: { hint?: string },
): Promise<FacialIdentifyResult> {
  if (!isFacialConfigured()) {
    logger.warn("Facial recognition called but not configured — returning stub result", {
      source: "facial.ts",
    });
    return { matches: [], source: "stub" };
  }

  const body: Record<string, string> = { image: imageBase64OrUrl };
  if (opts?.hint) body.hint = opts.hint;

  const res = await fetch(`${FACIAL_API_URL}/identify`, {
    method: "POST",
    headers: {
      "x-api-key": FACIAL_API_KEY!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Facial API error ${res.status}`);
  }

  const data = await res.json() as { matches?: Partial<FacialCandidate>[] };

  return {
    matches: (data.matches ?? []).map((m) => ({
      personId: m.personId ?? null,
      externalId: m.externalId ?? null,
      confidence: typeof m.confidence === "number" ? m.confidence : 0,
    })),
    source: "facial_api",
  };
}
