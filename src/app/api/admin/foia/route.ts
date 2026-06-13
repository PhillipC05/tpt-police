import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ai } from "@/lib/ai";
import { sendEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ADMIN_ROLES = ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"];

const draftSchema = z.object({
  id: z.string(),
  action: z.enum(["draft", "send"]),
  responseNotes: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { tenantId: session.user.tenantId };
  if (status) where.status = status;

  const requests = await prisma.foiaRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.user.role)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = draftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }

    const foiaRequest = await prisma.foiaRequest.findFirst({
      where: { id: parsed.data.id, tenantId: session.user.tenantId },
    });
    if (!foiaRequest) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (parsed.data.action === "draft") {
      let draft: string;

      if (ai.isConfigured()) {
        const systemPrompt =
          "You are a police department records administrator. Write professional, concise FOIA response letters. Be factual and clear. Use formal language appropriate for law enforcement correspondence.";
        const prompt = `Draft a FOIA response letter for the following request:

Reference: ${foiaRequest.referenceNumber}
Requester: ${foiaRequest.requesterName}${foiaRequest.requesterOrg ? ` (${foiaRequest.requesterOrg})` : ""}
Request description: ${foiaRequest.description}
Date received: ${foiaRequest.createdAt.toDateString()}
Due date: ${foiaRequest.dueDate ? foiaRequest.dueDate.toDateString() : "Not specified"}

Write a professional acknowledgment or response letter that acknowledges receipt, notes the reference number, sets expectations for turnaround, and includes standard FOIA compliance language.`;

        draft = await ai.complete(prompt, systemPrompt);
      } else {
        // Template fallback when AI is not configured
        draft = `Dear ${foiaRequest.requesterName},

Thank you for your Freedom of Information Act request, reference number ${foiaRequest.referenceNumber}, received on ${foiaRequest.createdAt.toDateString()}.

We are writing to acknowledge receipt of your request regarding: "${foiaRequest.description.slice(0, 200)}${foiaRequest.description.length > 200 ? "…" : ""}".

Your request is currently being reviewed. We will respond within the statutory timeframe${foiaRequest.dueDate ? ` (by ${foiaRequest.dueDate.toDateString()})` : ""}.

If you have any questions, please reference your request number ${foiaRequest.referenceNumber} in all correspondence.

Sincerely,
Records Management Division`;
      }

      const updated = await prisma.foiaRequest.update({
        where: { id: foiaRequest.id },
        data: { responseNotes: draft },
      });

      return NextResponse.json({ draft, foiaRequest: updated });
    }

    if (parsed.data.action === "send") {
      const notes = parsed.data.responseNotes ?? foiaRequest.responseNotes;
      if (!notes) {
        return NextResponse.json({ message: "No response to send — draft first" }, { status: 400 });
      }

      await sendEmail({
        to: foiaRequest.requesterEmail,
        subject: `FOIA Response — Ref: ${foiaRequest.referenceNumber}`,
        text: notes,
        html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${notes}</pre>`,
      });

      const updated = await prisma.foiaRequest.update({
        where: { id: foiaRequest.id },
        data: {
          status: "COMPLETED",
          responseNotes: notes,
          respondedAt: new Date(),
        },
      });

      await writeAuditLog({
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: "FOIA_RESPONSE_SENT",
        resource: "foia_request",
        resourceId: foiaRequest.id,
        metadata: { referenceNumber: foiaRequest.referenceNumber },
      });

      return NextResponse.json({ message: "Response sent", foiaRequest: updated });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error) {
    logger.error("FOIA admin action error", { error });
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
