import { prisma } from "./prisma";

export type AuditInput = {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  departmentId?: string | null;
  ownerId?: string | null;
  outcome?: string;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  before?: unknown;
  after?: unknown;
};

export async function recordAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      departmentId: input.departmentId ?? undefined,
      ownerId: input.ownerId ?? undefined,
      outcome: input.outcome ?? "SUCCESS",
      reason: input.reason ?? undefined,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
      before: input.before === undefined ? undefined : JSON.parse(JSON.stringify(input.before)),
      after: input.after === undefined ? undefined : JSON.parse(JSON.stringify(input.after)),
      createdById: input.actorId ?? undefined
    }
  });
}
