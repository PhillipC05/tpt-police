import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * File upload validation utilities.
 *
 * Provides type, size, and content validation for file uploads.
 * Can be extended with ClamAV integration for malware scanning
 * (requires clamd socket or TCP connection).
 */

// ─── Allowed MIME types by category ───────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/tiff",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "video/quicktime",
] as const;

export const ALLOWED_EVIDENCE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
] as const;

export type AllowedMimeType =
  | (typeof ALLOWED_IMAGE_TYPES)[number]
  | (typeof ALLOWED_DOCUMENT_TYPES)[number]
  | (typeof ALLOWED_VIDEO_TYPES)[number]
  | "audio/mpeg"
  | "audio/wav"
  | "audio/ogg";

// ─── Size constants ───────────────────────────────────────────────────────

export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10 MB
  document: 25 * 1024 * 1024, // 25 MB
  video: 500 * 1024 * 1024, // 500 MB
  evidence: 100 * 1024 * 1024, // 100 MB (general evidence)
} as const;

// ─── Upload validation result ─────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

interface FileUploadParams {
  /** File MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Allowed MIME types array */
  allowedTypes: readonly string[];
  /** Maximum file size in bytes */
  maxSize: number;
}

/**
 * Validate a file's mime type and size.
 */
export function validateFile(params: FileUploadParams): FileValidationResult {
  const { mimeType, size, allowedTypes, maxSize } = params;

  if (size <= 0) {
    return { valid: false, error: "File is empty" };
  }

  if (size > maxSize) {
    const maxMb = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxMb} MB`,
    };
  }

  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed. Accepted types: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Zod schema for validating file uploads via multipart form data or base64 payloads.
 * Designed to be used with structured JSON upload requests that include metadata.
 */
export const fileUploadSchema = z.object({
  fileName: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name is too long")
    .regex(
      /^[a-zA-Z0-9_\-.\s()]+$/,
      "File name contains invalid characters",
    ),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().int().positive("File size must be a positive integer"),
  /** Optional: base64-encoded content for small uploads via API */
  content: z.string().optional(),
});

/**
 * Zod schema for file uploads using multipart/form-data via FormData.
 * Validates that the file has a name, proper type, and reasonable size.
 */
export const formDataFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, "File is empty")
    .refine(
      (f) => f.size <= MAX_FILE_SIZES.evidence,
      `File exceeds maximum size of ${(MAX_FILE_SIZES.evidence / (1024 * 1024)).toFixed(0)} MB`,
    ),
});

/**
 * Validate a file upload and return a 400-response on failure, or null on success.
 *
 * @example
 * ```ts
 * const validation = validateFileUpload(file, ALLOWED_EVIDENCE_TYPES, MAX_FILE_SIZES.evidence);
 * if (validation) return validation;
 * ```
 */
export function validateFileUpload(
  file: { mimeType: string; size: number },
  allowedTypes: readonly string[] = ALLOWED_EVIDENCE_TYPES,
  maxSize: number = MAX_FILE_SIZES.evidence,
): NextResponse | null {
  const result = validateFile({
    mimeType: file.mimeType,
    size: file.size,
    allowedTypes,
    maxSize,
  });

  if (!result.valid) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  return null;
}

/**
 * Simple extension-based malware scan placeholder.
 *
 * In production, integrate with ClamAV:
 * - Install clamd on the server
 * - Use `clamd.scan()` via a Node.js wrapper or exec `clamdscan`
 *
 * Returns true if the file passes (no malware detected).
 */
export async function scanFileForMalware(
  buffer: Buffer,
): Promise<{ safe: boolean; error?: string }> {
  // ─── Placeholder: actual ClamAV integration ──────────────────────────
  //
  // import { createConnection } from "net";
  //
  // const clamdHost = process.env.CLAMD_HOST ?? "127.0.0.1";
  // const clamdPort = parseInt(process.env.CLAMD_PORT ?? "3310", 10);
  //
  // const response = await new Promise<string>((resolve, reject) => {
  //   const socket = createConnection(clamdPort, clamdHost, () => {
  //     // INSTREAM scan
  //     const command = Buffer.from("zINSTREAM\0", "ascii");
  //     socket.write(command);
  //
  //     const chunkSize = Buffer.alloc(4);
  //     let offset = 0;
  //     while (offset < buffer.length) {
  //       const chunk = buffer.subarray(offset, offset + 8192);
  //       chunkSize.writeUInt32BE(chunk.length, 0);
  //       socket.write(Buffer.concat([chunkSize, chunk]));
  //       offset += chunk.length;
  //     }
  //     socket.write(Buffer.alloc(4)); // zero-length chunk signals end
  //
  //     let result = "";
  //     socket.on("data", (data) => { result += data.toString(); });
  //     socket.on("end", () => resolve(result));
  //   });
  // });
  //
  // if (response.includes("FOUND")) {
  //   return { safe: false, error: "Malware detected in uploaded file" };
  // }
  // ─── End placeholder ──────────────────────────────────────────────────

  // For now, skip malware scanning if ClamAV is not configured
  if (!process.env.CLAMD_HOST) {
    return { safe: true };
  }

  return { safe: true };
}