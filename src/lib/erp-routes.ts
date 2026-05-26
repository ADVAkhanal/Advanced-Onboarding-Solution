import type { z } from "zod";
import { canAccessDepartment, departmentScopeForUser, requirePermission, requireUser, type AuthenticatedUser } from "./auth";
import { recordAudit } from "./audit";
import { assertNoProhibitedFields } from "./data-boundary";
import { handleRouteError, HttpError, ok } from "./http";
import { prisma } from "./prisma";
import type { PermissionKey } from "./permissions";

type Delegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
};

type HandlerConfig<Schema extends z.ZodTypeAny> = {
  delegate: () => Delegate;
  entityType: string;
  schema: Schema;
  createPermission?: PermissionKey;
  allowUserList?: boolean;
  allowUserCreate?: boolean;
  departmentScoped?: boolean;
  ownershipField?: string;
  defaultOrderBy?: Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">>;
  searchFields?: string[];
  buildData: (body: z.infer<Schema>, user: AuthenticatedUser) => Record<string, unknown>;
};

export function toDate(value?: string) {
  return value ? new Date(value) : undefined;
}

export function asNumber(value: unknown) {
  return value === undefined || value === null || value === "" ? undefined : Number(value);
}

function listScope(
  user: AuthenticatedUser,
  config: Pick<HandlerConfig<z.ZodTypeAny>, "allowUserList" | "departmentScoped" | "ownershipField">
) {
  if (user.userLevel === "USER") {
    if (!config.allowUserList) {
      throw new HttpError(403, "This ERP area requires manager, director, or admin access.", "forbidden");
    }
    return config.ownershipField ? { [config.ownershipField]: user.id } : { ownerId: user.id };
  }

  return config.departmentScoped ? departmentScopeForUser(user) : {};
}

function assertDepartmentAccess(user: AuthenticatedUser, departmentId?: string | null) {
  if (departmentId && !canAccessDepartment(user, departmentId)) {
    throw new HttpError(403, "You do not have access to this department.", "department_scope_denied");
  }
}

export function createErpCollectionHandlers<Schema extends z.ZodTypeAny>(config: HandlerConfig<Schema>) {
  return {
    async GET(request: Request) {
      try {
        const user = await requirePermission("erp:view");
        const { searchParams } = new URL(request.url);
        const departmentId = searchParams.get("departmentId");
        const status = searchParams.get("status");
        const q = searchParams.get("q");
        const take = Math.min(Number(searchParams.get("take") ?? 100), 250);

        assertDepartmentAccess(user, departmentId);

        const where: Record<string, unknown> = {
          organizationId: user.organizationId,
          archivedAt: null,
          ...listScope(user, config),
          ...(departmentId ? { departmentId } : {}),
          ...(status ? { status } : {})
        };

        if (q && config.searchFields?.length) {
          where.OR = config.searchFields.map((field) => ({
            [field]: { contains: q, mode: "insensitive" }
          }));
        }

        const records = await config.delegate().findMany({
          where,
          orderBy: config.defaultOrderBy ?? { updatedAt: "desc" },
          take
        });

        return ok({ records });
      } catch (error) {
        return handleRouteError(error);
      }
    },

    async POST(request: Request) {
      try {
        const user = config.allowUserCreate ? await requireUser() : await requirePermission(config.createPermission ?? "erp:create");
        if (!config.allowUserCreate && !user.permissions.includes(config.createPermission ?? "erp:create")) {
          throw new HttpError(403, "You do not have permission to create ERP records.", "forbidden");
        }

        const raw = await request.json();
        assertNoProhibitedFields(raw);
        const body = config.schema.parse(raw);
        const departmentId = "departmentId" in body ? (body.departmentId as string | undefined) : undefined;
        assertDepartmentAccess(user, departmentId);

        const created = await config.delegate().create({
          data: {
            organizationId: user.organizationId,
            createdById: user.id,
            updatedById: user.id,
            ...config.buildData(body, user)
          }
        });

        await recordAudit({
          organizationId: user.organizationId,
          actorId: user.id,
          action: `${config.entityType}.create`,
          entityType: config.entityType,
          entityId: (created as { id?: string }).id,
          departmentId: (created as { departmentId?: string | null }).departmentId,
          ownerId: (created as { ownerId?: string | null }).ownerId,
          after: created
        });

        return ok({ record: created }, { status: 201 });
      } catch (error) {
        return handleRouteError(error);
      }
    }
  };
}

export const erpDelegates = {
  customers: () => prisma.customerAccount as unknown as Delegate,
  vendors: () => prisma.vendorAccount as unknown as Delegate,
  parts: () => prisma.part as unknown as Delegate,
  quotes: () => prisma.quote as unknown as Delegate,
  salesOrders: () => prisma.salesOrder as unknown as Delegate,
  workOrders: () => prisma.workOrder as unknown as Delegate,
  operations: () => prisma.workOrderOperation as unknown as Delegate,
  schedule: () => prisma.shopScheduleItem as unknown as Delegate,
  inventory: () => prisma.inventoryItem as unknown as Delegate,
  purchaseOrders: () => prisma.purchaseOrder as unknown as Delegate,
  receipts: () => prisma.receipt as unknown as Delegate,
  shipments: () => prisma.shipment as unknown as Delegate,
  qualityInspections: () => prisma.qualityInspection as unknown as Delegate,
  nonconformance: () => prisma.nonconformanceRecord as unknown as Delegate,
  documents: () => prisma.documentRecord as unknown as Delegate,
  timeEntries: () => prisma.timeEntry as unknown as Delegate
};
