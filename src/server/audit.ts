import { prisma } from "@/lib/prisma";
import type { AuditAction, Role, Prisma } from "@prisma/client";

// Append-only history: every create/update/delete/promotion on a managed
// entity is recorded here and is never deleted, per the portal's "never
// erase records" requirement. The actor's identity is snapshotted (not a
// live FK) so this table stays writable and intact even after that user's
// account is later deleted.
export async function recordAudit(params: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  actor: { id: string; name: string; email: string; role: Role };
  changes?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      changes: (params.changes ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getAuditTrail(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}
