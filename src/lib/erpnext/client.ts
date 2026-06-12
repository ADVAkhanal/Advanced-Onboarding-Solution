/**
 * Read-only ERPNext (Frappe) bridge.
 *
 * Architecture (see docs/erpnext-integration.md): ERPNext runs as a forked,
 * pinned Frappe app (decoupled backend / system of record for the core ERP
 * domain). Shop-Management is the headless experience layer. This client is the
 * typed seam between them — read-only, fully env-gated, disabled by default.
 *
 * Credentials live ONLY in environment variables, never in code (Frappe API
 * key/secret token auth — `Authorization: token <key>:<secret>`):
 *   ERPNEXT_BASE_URL    e.g. https://erp.advancedpmc.com
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Data-scope boundary is enforced IN CODE: only operational doctypes can be
 * bridged (see ALLOWED_DOCTYPES). ERPNext's Accounting (GL/Payment/Bank), HR /
 * Payroll (Salary/Employee bank), and contact-PII doctypes are intentionally
 * not reachable through this client — matching the platform's no
 * CUI/PCI/PHI/banking posture and NIST 800-171 3.1.2 (least access).
 */

type ErpNextConfig = { baseUrl: string; apiKey: string; apiSecret: string };

export function erpnextConfig(): ErpNextConfig | null {
  const baseUrl = process.env.ERPNEXT_BASE_URL?.trim();
  const apiKey = process.env.ERPNEXT_API_KEY?.trim();
  const apiSecret = process.env.ERPNEXT_API_SECRET?.trim();
  if (!baseUrl || !apiKey || !apiSecret) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, apiSecret };
}

export function isErpNextConfigured(): boolean {
  return erpnextConfig() !== null;
}

/**
 * Operational doctype allowlist — the data-scope boundary, enforced in code.
 * Extend deliberately. Never add accounting / payroll / banking / PII doctypes
 * (GL Entry, Payment Entry, Bank Account, Salary Slip, Employee, Contact …).
 */
export const ALLOWED_DOCTYPES = new Set<string>([
  "Customer",
  "Supplier",
  "Item",
  "Item Group",
  "Customer Group",
  "Warehouse",
  "UOM",
  "BOM",
  "Work Order",
  "Job Card",
  "Operation",
  "Workstation",
  "Routing",
  "Quotation",
  "Sales Order",
  "Purchase Order",
  "Delivery Note",
  "Stock Entry",
  "Bin",
  "Quality Inspection",
  "Quality Inspection Template"
]);

const TIMEOUT_MS = 12_000;

export type ErpNextResult<T> = { data: T | null; error: string | null };

async function frappeGet<T>(path: string): Promise<ErpNextResult<T>> {
  const cfg = erpnextConfig();
  if (!cfg) return { data: null, error: "ERPNext is not configured." };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `token ${cfg.apiKey}:${cfg.apiSecret}`
      },
      cache: "no-store",
      signal: controller.signal
    });
    const text = await res.text();
    if (!res.ok) return { data: null, error: `ERPNext returned HTTP ${res.status}.` };
    let parsed: { message?: T; data?: T };
    try {
      parsed = JSON.parse(text) as { message?: T; data?: T };
    } catch {
      return { data: null, error: "ERPNext returned a non-JSON response." };
    }
    // Frappe REST returns { data: [...] }; RPC methods return { message: ... }.
    const value = (parsed.data ?? parsed.message ?? null) as T | null;
    return { data: value, error: null };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { data: null, error: aborted ? "ERPNext request timed out." : "Failed to reach ERPNext." };
  } finally {
    clearTimeout(timer);
  }
}

/** Liveness probe — returns the API user ERPNext authenticates the key as. */
export async function erpnextPing(): Promise<ErpNextResult<string>> {
  return frappeGet<string>("/api/method/frappe.auth.get_logged_user");
}

export type ListOptions = {
  fields?: string[];
  filters?: Array<[string, string, unknown]>;
  limit?: number;
  orderBy?: string;
};

/** List documents of an operational doctype. Rejects non-allowlisted doctypes. */
export async function erpnextList<T = Record<string, unknown>>(
  doctype: string,
  opts: ListOptions = {}
): Promise<ErpNextResult<T[]>> {
  if (!ALLOWED_DOCTYPES.has(doctype)) {
    return { data: null, error: `Doctype "${doctype}" is outside the operational data-scope boundary and cannot be bridged.` };
  }
  const params = new URLSearchParams();
  if (opts.fields?.length) params.set("fields", JSON.stringify(opts.fields));
  if (opts.filters?.length) params.set("filters", JSON.stringify(opts.filters));
  params.set("limit_page_length", String(Math.min(opts.limit ?? 50, 500)));
  if (opts.orderBy) params.set("order_by", opts.orderBy);
  return frappeGet<T[]>(`/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`);
}

/** Fetch a single document by name. Rejects non-allowlisted doctypes. */
export async function erpnextGetDoc<T = Record<string, unknown>>(
  doctype: string,
  name: string
): Promise<ErpNextResult<T>> {
  if (!ALLOWED_DOCTYPES.has(doctype)) {
    return { data: null, error: `Doctype "${doctype}" is outside the operational data-scope boundary.` };
  }
  return frappeGet<T>(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
}
