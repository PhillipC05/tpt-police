import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["DETECTIVE", "OFFICER", "DISPATCHER", "PRECINCT_ADMIN"]),
  badgeNumber: z.string().optional(),
  rank: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const department = searchParams.get("department");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;
  if (department) where.department = department;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { badgeNumber: { contains: search } },
    ];
  }

  const staff = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      badgeNumber: true,
      rank: true,
      department: true,
      phone: true,
      photoUrl: true,
      createdAt: true,
      _count: { select: { assignedCases: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(staff);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 });
    }

    const staff = await prisma.user.create({
      data: {
        ...parsed.data,
        tenantId: session.user.tenantId,
        passwordHash: null,
        status: "ACTIVE",
      },
    });

    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "STAFF_CREATED",
      resource: "user",
      resourceId: staff.id,
      metadata: { name: staff.name, role: staff.role },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error("Create staff error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}