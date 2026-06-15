import { appError } from "@/lib/error-codes";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";

/**
 * Papermark bridge (ADR 0001: env-gated, defensive, coded errors).
 *
 * Disabled until PAPERMARK_API_URL (default https://app.papermark.io) and
 * PAPERMARK_API_KEY are set. Used to share proposal PDFs as trackable links and
 * to read back view/download analytics that feed the CRM dashboard. Endpoint
 * shapes follow Papermark's documented API; failures surface as DOC-502 — a
 * Papermark outage never breaks local proposal records.
 */

const TIMEOUT_MS = 10_000;
const DEFAULT_URL = "https://app.papermark.io";

export type PapermarkConfig = { url: string; apiKey: string };

export function papermarkConfig(): PapermarkConfig | null {
  const apiKey = process.env.PAPERMARK_API_KEY?.trim();
  if (!apiKey) return null;
  const url = (process.env.PAPERMARK_API_URL?.trim() || DEFAULT_URL).replace(/\/+$/, "");
  return { url, apiKey };
}

export function isPapermarkConfigured(): boolean {
  return papermarkConfig() !== null;
}

export function papermarkStatus() {
  const cfg = papermarkConfig();
  return { configured: Boolean(cfg), url: cfg?.url ?? null };
}

async function papermarkRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const cfg = papermarkConfig();
  if (!cfg) throw appError("DOC-503");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!res.ok) {
      logger.error({ error_code: "DOC-502", status: res.status, path }, "Papermark request failed");
      throw appError("DOC-502", `HTTP ${res.status}.`);
    }
    return await res.json().catch(() => ({}));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const reason = error instanceof Error && error.name === "AbortError" ? "timed out" : "unreachable";
    logger.error({ error_code: "DOC-502", reason, path }, "Papermark unreachable");
    throw appError("DOC-502", `Service ${reason}.`);
  } finally {
    clearTimeout(timer);
  }
}

export type ProposalLink = { documentId: string | null; linkId: string | null; viewUrl: string | null };

/**
 * Share a proposal PDF (by public URL) as a trackable Papermark link.
 * The PDF itself is produced by the platform's print templates and hosted at a
 * URL Papermark can fetch — keeping server-side file handling out of scope.
 */
export async function createProposalLink(input: { name: string; fileUrl: string }): Promise<ProposalLink> {
  const doc = (await papermarkRequest("POST", "/api/documents", {
    name: input.name,
    url: input.fileUrl
  })) as Record<string, unknown>;
  const documentId = typeof doc.id === "string" ? doc.id : (doc.documentId as string) ?? null;

  let linkId: string | null = null;
  let viewUrl: string | null = null;
  if (documentId) {
    const link = (await papermarkRequest("POST", "/api/links", { documentId })) as Record<string, unknown>;
    linkId = typeof link.id === "string" ? link.id : null;
    viewUrl = typeof link.url === "string" ? link.url : null;
  }
  return { documentId, linkId, viewUrl };
}

export type LinkAnalytics = { views: number; downloads: number };

/** Read view/download counts for a shared link (feeds back into the CRM record). */
export async function getLinkAnalytics(linkId: string): Promise<LinkAnalytics> {
  const json = (await papermarkRequest("GET", `/api/links/${encodeURIComponent(linkId)}/views`)) as Record<string, unknown>;
  const views = Array.isArray(json.views) ? json.views.length : Number(json.views ?? json.viewCount ?? 0) || 0;
  const downloads = Number(json.downloads ?? json.downloadCount ?? 0) || 0;
  return { views, downloads };
}
