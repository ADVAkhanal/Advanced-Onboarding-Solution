import { z } from "zod";
import { requirePermission, canAccessDepartment } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "SUBMIT_FOR_REVIEW"]),
  reason: z.string().trim().max(2000).optional()
});

export async function POST(request: Request, { params }: { params: { versionId: string } }) {
  try {
    const user = await requirePermission("sop:approve");
    const body = decisionSchema.parse(await request.json());

    const version = await prisma.sopDocumentVersion.findFirst({
      where: { id: params.versionId, organizationId: user.organizationId, archivedAt: null }
    });
    if (!version) {
      throw new HttpError(404, "SOP version not found.", "not_found");
    }
    if (version.departmentId && !canAccessDepartment(user, version.departmentId)) {
      throw new HttpError(403, "You cannot approve SOPs for this department.", "department_scope_denied");
    }

    if (body.decision === "APPROVE" && version.approvedById === user.id) {
      throw new HttpError(409, "You cannot approve a version you submitted yourself.", "self_approval_blocked");
    }

    const updates: Parameters<typeof prisma.sopDocumentVersion.update>[0]["data"] = {
      updatedById: user.id
    };
    const now = new Date();

    if (body.decision === "SUBMIT_FOR_REVIEW") {
      if (version.approvalStatus !== "DRAFT") {
        throw new HttpError(409, "Only drafts can be submitted for review.", "invalid_transition");
      }
      updates.approvalStatus = "IN_REVIEW";
    } else if (body.decision === "REJECT") {
      updates.approvalStatus = "REJECTED";
      updates.rejectedById = user.id;
      updates.rejectedAt = now;
      updates.rejectionReason = body.reason;
    } else if (body.decision === "APPROVE") {
      if (!["DRAFT", "IN_REVIEW"].includes(version.approvalStatus)) {
        throw new HttpError(409, "Only drafts or in-review versions can be approved.", "invalid_transition");
      }
      updates.approvalStatus = "APPROVED";
      updates.approvedById = user.id;
      updates.approvedAt = now;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.sopDocumentVersion.update({
        where: { id: version.id },
        data: updates
      });

      if (body.decision === "APPROVE") {
        // Supersede any previously APPROVED versions of the same document.
        await tx.sopDocumentVersion.updateMany({
          where: {
            organizationId: user.organizationId,
            documentId: version.documentId,
            id: { not: version.id },
            approvalStatus: "APPROVED"
          },
          data: {
            approvalStatus: "SUPERSEDED",
            supersededAt: now,
            supersededById: user.id,
            updatedById: user.id
          }
        });
      }

      await tx.sopApproval.create({
        data: {
          organizationId: user.organizationId,
          documentVersionId: version.id,
          approverId: user.id,
          decision: body.decision,
          reason: body.reason,
          departmentId: version.departmentId,
          ownerId: version.ownerId,
          createdById: user.id,
          updatedById: user.id
        }
      });

      return updated;
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: `sop.${body.decision.toLowerCase()}`,
      entityType: "sop_document_version",
      entityId: version.id,
      departmentId: version.departmentId,
      ownerId: version.ownerId,
      reason: body.reason,
      after: { approvalStatus: result.approvalStatus, decidedAt: now.toISOString() }
    });

    return ok({ version: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
