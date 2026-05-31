import { requirePermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { getDashboard } from "@/lib/dashboards/registry";
import type { TableWidget } from "@/lib/dashboards/types";
import { toCsv } from "@/lib/export/csv";
import { handleRouteError, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: { key: string } }) {
  try {
    const def = getDashboard(context.params.key);
    if (!def) {
      throw new HttpError(404, "Dashboard not found.", "not_found");
    }

    const user = await requirePermission(def.permission);
    const data = await def.load({ organizationId: user.organizationId, user });

    const tables = data.widgets.filter(
      (w): w is TableWidget => w.kind === "table" && w.exportable !== false
    );
    if (tables.length === 0) {
      throw new HttpError(422, "This dashboard has no exportable tables.", "no_export");
    }

    const requestedId = new URL(request.url).searchParams.get("widget");
    const selected = requestedId ? tables.filter((t) => t.id === requestedId) : tables;
    if (selected.length === 0) {
      throw new HttpError(404, "Requested table not found on this dashboard.", "not_found");
    }

    // One CSV; when multiple tables are exported they are stacked with a
    // section title line and a blank separator so the file stays readable.
    const blocks = selected.map((t) => {
      const body = toCsv(
        t.columns.map((c) => ({ key: c.key, label: c.label })),
        t.rows
      );
      return selected.length > 1 ? `# ${t.title}\n${body}` : body;
    });
    const csv = blocks.join("\n\n");

    await recordAudit({
      organizationId: user.organizationId,
      actorId: user.id,
      action: "dashboard.export_csv",
      entityType: "dashboard",
      entityId: def.key,
      after: { dashboard: def.key, tables: selected.map((t) => t.id), rows: selected.reduce((n, t) => n + t.rows.length, 0) }
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${def.key}.csv`
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
