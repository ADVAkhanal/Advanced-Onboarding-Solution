import { z } from "zod";
import { requirePermission, type AuthenticatedUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { appError } from "@/lib/error-codes";
import { handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createProposalLink, getLinkAnalytics, isPapermarkConfigured } from "@/lib/integrations/papermark";

export const dynamic = "force-dynamic";

const shareSchema = z.object({ fileUrl: z.string().url().max(1000) });

async function loadRequest(user: AuthenticatedUser, id: string) {
  const record = await prisma.crmRequest.findFirst({
    where: { id, organizationId: user.organizationId, archivedAt: null }
  });
  if (!record) throw appError("REQ-404", "CRM request not found.");
  return record;
}

// Share a proposal PDF (by public URL) as a trackable Papermark link.
export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("crm:manage");
    if (!isPapermarkConfigured()) throw appError("DOC-503");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const { fileUrl } = shareSchema.parse(raw);
    const record = await loadRequest(user, context.params.id);

    const link = await createProposalLink({ name: record.title, fileUrl });
    const terminal = record.status === "WON" || record.status === "LOST";
    const updated = await prisma.crmRequest.update({
      where: { id: record.id },
      data: {
        papermarkDocumentId: link.documentId,
        papermarkLinkId: link.linkId,
        proposalUrl: link.viewUrl ?? fileUrl,
        status: terminal ? record.status : "PROPOSAL_SHARED",
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "crm_request.proposal_shared",
      entityType: "crm_request",
      entityId: record.id,
      after: { papermarkLinkId: link.linkId, viewUrl: link.viewUrl }
    });
    return ok({ record: updated, viewUrl: link.viewUrl });
  } catch (error) {
    return handleRouteError(error);
  }
}

// Refresh Papermark view/download analytics back into the local record.
export async function PATCH(_request: Request, context: { params: { id: string } }) {
  try {
    const user = await requirePermission("crm:manage");
    if (!isPapermarkConfigured()) throw appError("DOC-503");
    const record = await loadRequest(user, context.params.id);
    if (!record.papermarkLinkId) throw appError("DOC-502", "No Papermark link has been shared for this request yet.");

    const analytics = await getLinkAnalytics(record.papermarkLinkId);
    const updated = await prisma.crmRequest.update({
      where: { id: record.id },
      data: {
        proposalViews: analytics.views,
        proposalDownloads: analytics.downloads,
        lastViewedAt: analytics.views > 0 ? new Date() : record.lastViewedAt,
        updatedById: user.id
      }
    });

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "crm_request.proposal_analytics",
      entityType: "crm_request",
      entityId: record.id,
      after: analytics
    });
    return ok({ record: updated, analytics });
  } catch (error) {
    return handleRouteError(error);
  }
}
