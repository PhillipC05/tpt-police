import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { uploadFile } from "@/lib/storage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!booking) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ message: "No file provided" }, { status: 400 });

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: "Invalid file type. Only JPEG, PNG, WebP allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large. Max 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `mugshots/${session.user.tenantId}/${id}-${Date.now()}.${file.type.split("/")[1]}`;
    const provider = (process.env.STORAGE_PROVIDER as "r2" | "wasabi") || "r2";

    await uploadFile(key, buffer, file.type, provider);

    const mugShotUrl = `${provider === "r2" ? process.env.R2_PUBLIC_URL : process.env.WASABI_PUBLIC_URL}/${key}`;

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