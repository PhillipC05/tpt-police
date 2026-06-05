/**
 * Secrets management utility.
 *
 * Provides a centralized interface for retrieving secrets from environment
 * variables with built-in validation. In production, swap the env-based
 * implementation for a vault provider (AWS Secrets Manager, HashiCorp Vault,
 * Azure Key Vault, etc.).
 *
 * Usage:
 *   const dbUrl = getSecret("DATABASE_URL");
 *   const apiKey = getSecret("DISPATCH_API_KEY");
 */

import { timingSafeEqual } from "crypto";

// ─── Required secrets that must be set in production ──────────────────────

const REQUIRED_SECRETS: string[] = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
];

// ─── Optional secrets with defaults ───────────────────────────────────────

const SECRET_DEFAULTS: Record<string, string> = {
  PORT: "3000",
  NODE_ENV: "development",
};

export class SecretsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretsError";
  }
}

/**
 * Retrieve a secret by key. Throws if the secret is missing and has no default.
 */
export function getSecret(key: string): string {
  const value = process.env[key];
  if (value) return value;

  if (key in SECRET_DEFAULTS) {
    return SECRET_DEFAULTS[key];
  }

  throw new SecretsError(
    `Missing required secret: ${key}. Set it in your environment or .env file.`,
  );
}

/**
 * Retrieve a secret by key, returning undefined instead of throwing if missing.
 */
export function getSecretOptional(key: string): string | undefined {
  return process.env[key] ?? SECRET_DEFAULTS[key];
}

/**
 * Validate that all required secrets are present.
 * Call during application startup to fail fast.
 *
 * @returns Array of missing secret names.
 */
export function validateRequiredSecrets(): string[] {
  const missing: string[] = [];
  for (const key of REQUIRED_SECRETS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  return missing;
}

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 * Use this for comparing secrets, API keys, and webhook tokens.
 */
export function verifySecret(provided: string, expected: string): boolean {
  const buf1 = Buffer.from(provided);
  const buf2 = Buffer.from(expected);
  if (provided.length !== expected.length) {
    // Compare truncated buffers to avoid leaking length info via timing
    try {
      timingSafeEqual(
        buf1.subarray(0, Math.min(buf1.length, buf2.length)),
        buf2.subarray(0, Math.min(buf1.length, buf2.length)),
      );
      return false; // lengths differ, so definitely not equal
    } catch {
      return false;
    }
  }
  return timingSafeEqual(buf1, buf2);
}

/**
 * Retrieve a database URL with optional read-replica support.
 */
export function getDatabaseUrl(mode: "primary" | "replica" = "primary"): string {
  if (mode === "replica") {
    return process.env.DATABASE_URL_REPLICA ?? getSecret("DATABASE_URL");
  }
  return getSecret("DATABASE_URL");
}

/**
 * Retrieve a Redis URL. Returns undefined if not configured.
 */
export function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL;
}

/**
 * Secrets provider interface for swapping implementations.
 */
export interface SecretsProvider {
  get(key: string): Promise<string>;
  getOptional(key: string): Promise<string | undefined>;
}

/**
 * Environment variable-based secrets provider (default).
 */
export class EnvSecretsProvider implements SecretsProvider {
  async get(key: string): Promise<string> {
    return getSecret(key);
  }

  async getOptional(key: string): Promise<string | undefined> {
    return getSecretOptional(key);
  }
}

/**
 * Validate secrets on startup. Call this in the application bootstrap.
 */
export function validateSecretsOnStartup(): void {
  const missing = validateRequiredSecrets();
  if (missing.length > 0) {
    console.error(
      `[SECRETS] Missing required secrets: ${missing.join(", ")}. ` +
        "Set them in environment variables or .env file before starting.",
    );
  }
}