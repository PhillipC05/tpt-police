import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { uploadFile } from "@/lib/storage";

// Map of allowed MIME types to safe file extensions
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Sanitize a string for use in S3 object keys by removing path separators
 * and other unsafe characters.
 */
function sanitizeKeyComponent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sanitizedTenantId = sanitizeKeyComponent(session.user.tenantId);
  const sanitizedBookingId = sanitizeKeyComponent(id);
  const booking = await prisma.booking.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!booking) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 });

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json({ message: "Invalid file type. Only JPEG, PNG, WebP allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large. Max 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `mugshots/${sanitizedTenantId}/${sanitizedBookingId}-${Date.now()}.${ext}`;
    const provider = (process.env.STORAGE_PROVIDER as "r2" | "wasabi") || "r2";

    await uploadFile(key, buffer, file.type, provider);

    const baseUrl = provider === "r2" ? process.env.R2_PUBLIC_URL : process.env.WASABI_PUBLIC_URL;
    // Ensure HTTPS for production
    const secureBaseUrl = baseUrl?.startsWith("https://") ? baseUrl : baseUrl?.replace(/^http:/, "https:");
    if (!secureBaseUrl) {
      return NextResponse.json({ message: "Storage URL not configured" }, { status: 500 });
    }
    const mugShotUrl = `${secureBaseUrl}/${key}`;

    await prisma.booking.update({ where: { id }, data: { mugShotUrl } });

    // Also update the linked Person's photoUrl
    if (booking.personId) {
      await prisma.person.update({ where: { id: booking.personId }, data: { photoUrl: mugShotUrl } });
    }

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "MUGSHOT_UPLOADED",
      resource: "booking",
      resourceId: id,
      metadata: { fileKey: key },
    });

    return NextResponse.json({ mugShotUrl }, { status: 200 });
  } catch (error) {
    console.error("Mugshot upload error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}