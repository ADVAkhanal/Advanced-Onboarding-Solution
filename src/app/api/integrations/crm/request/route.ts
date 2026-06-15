import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertNoProhibitedFields } from "@/lib/data-boundary";
import { handleRouteError, ok } from "@/lib/http";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createOpportunity, createPerson, isTwentyConfigured } from "@/lib/integrations/twenty";

export const dynamic = "force-dynamic";

const schema = z.object({
  requestType: z.enum(["customer", "proposal"]).optional(),
  contactName: z.string().min(1).max(160),
  companyName: z.string().max(160).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(40).optional(),
  title: z.string().min(1).max(200),
  summary: z.string().max(4000).optional(),
  estValue: z.coerce.number().min(0).max(1e12).optional()
});

/**
 * Capture a customer/proposal request. The local CrmRequest is created FIRST
 * and is authoritative; pushing to Twenty CRM is best-effort, so a CRM outage
 * downgrades to a logged sync error rather than losing the capture.
 */
export async function POST(request: Request) {
  try {
    const user = await requirePermission("crm:manage");
    const raw = await request.json();
    assertNoProhibitedFields(raw);
    const body = schema.parse(raw);

    let record = await prisma.crmRequest.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        ownerId: user.id,
        departmentId: user.departmentId,
        requestType: body.requestType ?? "customer",
        contactName: body.contactName,
        companyName: body.companyName,
        email: body.email,
        phone: body.phone,
        title: body.title,
        summary: body.summary,
        estValue: body.estValue,
        status: "NEW"
      }
    });

    let crmWarning: string | undefined;
    if (isTwentyConfigured()) {
      try {
        const [firstName, ...rest] = body.contactName.trim().split(/\s+/);
        const personId = await createPerson({
          firstName: firstName || body.contactName,
          lastName: rest.join(" ") || undefined,
          email: body.email,
          phone: body.phone,
          companyName: body.companyName
        });
        const opportunityId =
          body.requestType === "proposal" || body.estValue != null
            ? await createOpportunity({ name: body.title, pointOfContactId: personId, amount: body.estValue })
            : null;
        record = await prisma.crmRequest.update({
          where: { id: record.id },
          data: { twentyPersonId: personId, twentyOpportunityId: opportunityId, status: "SENT_TO_CRM", syncError: null }
        });
      } catch (error) {
        crmWarning = error instanceof Error ? error.message : "Twenty CRM error.";
        logger.error({ error_code: "CRM-502", id: record.id }, "Twenty CRM push failed; local record kept");
        record = await prisma.crmRequest.update({ where: { id: record.id }, data: { syncError: crmWarning } });
      }
    }

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "crm_request.create",
      entityType: "crm_request",
      entityId: record.id,
      after: record
    });

    return ok({ record, crmConfigured: isTwentyConfigured(), crmWarning }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
