import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileKey: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  category: z.string().optional(),
});

interface DocumentMeta {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const staff = await prisma.user.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!staff) return NextResponse.json({ message: "Staff not found" }, { status: 404 });

  const documents = await prisma.auditLog.findMany({
    where: {
      resource: "staff_document",
      resourceId: id,
      tenantId: session.user.tenantId,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    documents.map((doc: { id: string; metadata: unknown; createdAt: Date }) => {
      const meta = (doc.metadata ?? {}) as DocumentMeta;
      return {
        id: doc.id,
        fileName: meta.fileName ?? "Unknown",
        fileUrl: meta.fileUrl ?? "",
        fileSize: meta.fileSize ?? null,
        mimeType: meta.mimeType ?? null,
        category: meta.category ?? null,
        uploadedAt: doc.createdAt,
      };
    })
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "STAFF_DOCUMENT_UPLOADED",
      resource: "staff_document",
      resourceId: id,
      metadata: parsed.data as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ message: "Document uploaded" }, { status: 201 });
  } catch (error) {
    console.error("Upload document error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}