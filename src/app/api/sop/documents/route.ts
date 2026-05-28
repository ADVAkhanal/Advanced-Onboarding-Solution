import { z } from "zod";
import { requirePermission, canAccessDepartment } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { chunkSopText } from "@/lib/ai/chunker";

export const dynamic = "force-dynamic";

const documentCreateSchema = z.object({
  documentKey: z.string().trim().min(2).max(120).regex(/^[a-z0-9][a-z0-9-_/]+$/i, "Use letters, digits, /, - or _"),
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().max(80).optional(),
  departmentId: z.string().trim().min(1).optional(),
  visibility: z.enum(["ALL_USERS", "DEPARTMENT", "MANAGER_PLUS", "DIRECTOR_PLUS", "ADMIN_ONLY"]).default("ALL_USERS"),
  safetyCritical: z.boolean().default(false),
  qualityCritical: z.boolean().default(false),
  customerImpacting: z.boolean().default(false),
  summary: z.string().trim().max(2000).optional(),
  rawText: z.string().trim().min(20).max(120_000),
  changeSummary: z.string().trim().max(2000).optional()
});

export async function GET(request: Request) {
  try {
    const user = await requirePermission("sop:author");
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");

    if (departmentId && !canAccessDepartment(user, departmentId)) {
      throw new HttpError(403, "You do not have access to this department.", "department_scope_denied");
    }

    const documents = await prisma.sopDocument.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        ...(departmentId ? { departmentId } : {})
      },
      orderBy: { updatedAt: "desc" },
      take: 200
    });

    const versions = await prisma.sopDocumentVersion.findMany({
      where: {
        organizationId: user.organizationId,
        documentId: { in: documents.map((doc) => doc.id) },
        archivedAt: null,
        ...(status ? { approvalStatus: status as never } : {})
      },
      orderBy: [{ documentId: "asc" }, { versionNumber: "desc" }]
    });

    return ok({ documents, versions });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("sop:author");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = documentCreateSchema.parse(raw);

    if (body.departmentId && !canAccessDepartment(user, body.departmentId)) {
      throw new HttpError(403, "You cannot author SOPs for this department.", "department_scope_denied");
    }

    const chunks = chunkSopText({ rawText: body.rawText });
    if (chunks.length === 0) {
      throw new HttpError(422, "Could not split this SOP into searchable chunks. Add more content.", "empty_chunks");
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.sopDocument.findUnique({
        where: { organizationId_documentKey: { organizationId: user.organizationId, documentKey: body.documentKey } }
      });

      const document = existing
        ? await tx.sopDocument.update({
            where: { id: existing.id },
            data: {
              title: body.title,
              category: body.category,
              departmentId: body.departmentId,
              visibility: body.visibility,
              safetyCritical: body.safetyCritical,
              qualityCritical: body.qualityCritical,
              customerImpacting: body.customerImpacting,
              summary: body.summary,
              updatedById: user.id
            }
          })
        : await tx.sopDocument.create({
            data: {
              organizationId: user.organizationId,
              documentKey: body.documentKey,
              title: body.title,
              category: body.category,
              departmentId: body.departmentId,
              visibility: body.visibility,
              safetyCritical: body.safetyCritical,
              qualityCritical: body.qualityCritical,
              customerImpacting: body.customerImpacting,
              summary: body.summary,
              ownerId: user.id,
              createdById: user.id,
              updatedById: user.id
            }
          });

      const latest = await tx.sopDocumentVersion.findFirst({
        where: { organizationId: user.organizationId, documentId: document.id },
        orderBy: { versionNumber: "desc" }
      });
      const nextVersion = (latest?.versionNumber ?? 0) + 1;

      const version = await tx.sopDocumentVersion.create({
        data: {
          organizationId: user.organizationId,
          documentId: document.id,
          versionNumber: nextVersion,
          approvalStatus: "DRAFT",
          rawText: body.rawText,
          changeSummary: body.changeSummary,
          departmentId: body.departmentId,
          ownerId: user.id,
          createdById: user.id,
          updatedById: user.id
        }
      });

      await tx.sopChunk.createMany({
        data: chunks.map((chunk) => ({
          organizationId: user.organizationId,
          documentId: document.id,
          documentVersionId: version.id,
          chunkIndex: chunk.index,
          headingPath: chunk.headingPath,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          departmentId: body.departmentId,
          ownerId: user.id,
          createdById: user.id,
          updatedById: user.id
        }))
      });

      return { document, version, chunkCount: chunks.length };
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "sop.draft",
      entityType: "sop_document_version",
      entityId: result.version.id,
      departmentId: body.departmentId,
      ownerId: user.id,
      after: { documentKey: body.documentKey, versionNumber: result.version.versionNumber, chunkCount: result.chunkCount }
    });

    return ok({ document: result.document, version: result.version, chunkCount: result.chunkCount }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
