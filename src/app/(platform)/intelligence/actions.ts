"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GangType, GangStatus, GangMemberRole, AssociationType, ConfidenceLevel, ThreatLevel } from "@prisma/client";

const ADMIN_ROLES = ["PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];
const DETECTIVE_ROLES = ["DETECTIVE", "PRECINCT_ADMIN", "CITY_ADMIN", "PROVINCE_ADMIN", "SUPER_ADMIN"];

// ─── Gang Management ──────────────────────────────────────────────────────────

const createGangSchema = z.object({
  name: z.string().min(1).max(200),
  aliases: z.array(z.string()).optional().default([]),
  type: z.nativeEnum(GangType),
  status: z.nativeEnum(GangStatus).optional().default("ACTIVE"),
  territory: z.string().optional(),
  description: z.string().optional(),
});

export async function createGang(data: unknown) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (!ADMIN_ROLES.includes(session.user.role)) return { error: "Insufficient permissions" };

  const parsed = createGangSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  try {
    const gang = await prisma.gang.create({
      data: {
        ...parsed.data,
        tenantId: session.user.tenantId,
        createdById: session.user.id,
      },
    });
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "CREATE_GANG",
      resource: "gang",
      resourceId: gang.id,
      metadata: { name: gang.name, type: gang.type },
    });
    revalidatePath("/intelligence/gangs");
    return { success: true, id: gang.id };
  } catch (err) {
    logger.error("Failed to create gang", { error: String(err), userId: session.user.id });
    return { error: "Failed to create gang" };
  }
}

const updateGangSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  aliases: z.array(z.string()).optional(),
  type: z.nativeEnum(GangType).optional(),
  status: z.nativeEnum(GangStatus).optional(),
  territory: z.string().optional(),
  description: z.string().optional(),
});

export async function updateGang(id: string, data: unknown) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (!ADMIN_ROLES.includes(session.user.role)) return { error: "Insufficient permissions" };

  const parsed = updateGangSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const gang = await prisma.gang.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!gang) return { error: "Not found" };

  try {
    await prisma.gang.update({ where: { id }, data: parsed.data });
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "UPDATE_GANG",
      resource: "gang",
      resourceId: id,
      metadata: parsed.data as Record<string, unknown>,
    });
    revalidatePath(`/intelligence/gangs/${id}`);
    revalidatePath("/intelligence/gangs");
    return { success: true };
  } catch (err) {
    logger.error("Failed to update gang", { error: String(err), gangId: id });
    return { error: "Failed to update gang" };
  }
}

export async function addGangMember(gangId: string, personId: string, role: GangMemberRole, notes?: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (!DETECTIVE_ROLES.includes(session.user.role)) return { error: "Insufficient permissions" };

  const gang = await prisma.gang.findFirst({ where: { id: gangId, tenantId: session.user.tenantId } });
  if (!gang) return { error: "Not found" };

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return { error: "Person not found" };

  try {
    await prisma.gangMember.create({ data: { gangId, personId, role, notes } });
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "ADD_GANG_MEMBER",
      resource: "gangMember",
      metadata: { gangId, personId, role, gangName: gang.name },
    });
    revalidatePath(`/intelligence/gangs/${gangId}`);
    revalidatePath(`/persons/${personId}`);
    return { success: true };
  } catch (err) {
    logger.error("Failed to add gang member", { error: String(err), gangId, personId });
    return { error: "Failed to add member — may already be linked" };
  }
}

export async function removeGangMember(gangId: string, personId: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (!DETECTIVE_ROLES.includes(session.user.role)) return { error: "Insufficient permissions" };

  const gang = await prisma.gang.findFirst({ where: { id: gangId, tenantId: session.user.tenantId } });
  if (!gang) return { error: "Not found" };

  try {
    await prisma.gangMember.deleteMany({ where: { gangId, personId } });
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "REMOVE_GANG_MEMBER",
      resource: "gangMember",
      metadata: { gangId, personId },
    });
    revalidatePath(`/intelligence/gangs/${gangId}`);
    revalidatePath(`/persons/${personId}`);
    return { success: true };
  } catch (err) {
    logger.error("Failed to remove gang member", { error: String(err), gangId, personId });
    return { error: "Failed to remove member" };
  }
}

// ─── Threat Level ─────────────────────────────────────────────────────────────

export async function setPersonThreatLevel(personId: string, level: ThreatLevel) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (!DETECTIVE_ROLES.includes(session.user.role)) return { error: "Insufficient permissions" };

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return { error: "Not found" };

  try {
    await prisma.person.update({ where: { id: personId }, data: { threatLevel: level } });
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "SET_THREAT_LEVEL",
      resource: "person",
      resourceId: personId,
      metadata: { previousLevel: person.threatLevel, newLevel: level },
    });
    revalidatePath(`/persons/${personId}`);
    revalidatePath("/intelligence");
    return { success: true };
  } catch (err) {
    logger.error("Failed to set threat level", { error: String(err), personId });
    return { error: "Failed to set threat level" };
  }
}

// ─── Associations ─────────────────────────────────────────────────────────────

const addAssociationSchema = z.object({
  personAId: z.string().min(1),
  personBId: z.string().min(1),
  relationshipType: z.nativeEnum(AssociationType),
  confidence: z.nativeEnum(ConfidenceLevel).optional().default("UNVERIFIED"),
  notes: z.string().optional(),
});

export async function addAssociation(data: unknown) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (!DETECTIVE_ROLES.includes(session.user.role)) return { error: "Insufficient permissions" };

  const parsed = addAssociationSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  if (parsed.data.personAId === parsed.data.personBId) return { error: "Cannot link a person to themselves" };

  try {
    await prisma.personAssociation.create({
      data: { ...parsed.data, tenantId: session.user.tenantId },
    });
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "ADD_PERSON_ASSOCIATION",
      resource: "personAssociation",
      metadata: {
        personAId: parsed.data.personAId,
        personBId: parsed.data.personBId,
        type: parsed.data.relationshipType,
      },
    });
    revalidatePath(`/persons/${parsed.data.personAId}`);
    revalidatePath(`/persons/${parsed.data.personBId}`);
    return { success: true };
  } catch (err) {
    logger.error("Failed to add association", { error: String(err) });
    return { error: "Failed to add association — may already exist" };
  }
}

export async function removeAssociation(id: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (!DETECTIVE_ROLES.includes(session.user.role)) return { error: "Insufficient permissions" };

  const assoc = await prisma.personAssociation.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!assoc) return { error: "Not found" };

  try {
    await prisma.personAssociation.delete({ where: { id } });
    await writeAuditLog({
      userId: session.user.id,
      tenantId: session.user.tenantId,
      action: "REMOVE_PERSON_ASSOCIATION",
      resource: "personAssociation",
      resourceId: id,
    });
    revalidatePath(`/persons/${assoc.personAId}`);
    revalidatePath(`/persons/${assoc.personBId}`);
    return { success: true };
  } catch (err) {
    logger.error("Failed to remove association", { error: String(err), id });
    return { error: "Failed to remove association" };
  }
}
