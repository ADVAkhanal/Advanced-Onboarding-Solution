import { appError } from "@/lib/error-codes";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";

/**
 * Twenty CRM bridge (ADR 0001: env-gated, defensive, coded errors).
 *
 * Disabled until TWENTY_API_URL and TWENTY_API_KEY are set. Talks to Twenty's
 * REST API (`/rest/*`) with a Bearer key. Field shapes follow Twenty's default
 * workspace schema; payloads are kept minimal and failures surface as CRM-502
 * with the HTTP status logged — a CRM outage never breaks local capture.
 */

const TIMEOUT_MS = 10_000;

export type TwentyConfig = { url: string; apiKey: string };

export function twentyConfig(): TwentyConfig | null {
  const url = process.env.TWENTY_API_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.TWENTY_API_KEY?.trim();
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

export function isTwentyConfigured(): boolean {
  return twentyConfig() !== null;
}

export function twentyStatus() {
  const cfg = twentyConfig();
  return { configured: Boolean(cfg), url: cfg?.url ?? null };
}

/** Pull a created-record id out of Twenty's REST/GraphQL response shapes. */
function extractId(json: unknown): string | null {
  const j = json as Record<string, unknown> | null;
  const data = (j?.data ?? j) as Record<string, unknown> | undefined;
  if (!data) return null;
  if (typeof data.id === "string") return data.id;
  for (const v of Object.values(data)) {
    if (v && typeof v === "object" && typeof (v as { id?: unknown }).id === "string") {
      return (v as { id: string }).id;
    }
  }
  return null;
}

async function twentyPost(path: string, body: unknown): Promise<unknown> {
  const cfg = twentyConfig();
  if (!cfg) throw appError("CRM-503");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      logger.error({ error_code: "CRM-502", status: res.status, path }, "Twenty CRM request failed");
      throw appError("CRM-502", `HTTP ${res.status}.`);
    }
    return await res.json().catch(() => ({}));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const reason = error instanceof Error && error.name === "AbortError" ? "timed out" : "unreachable";
    logger.error({ error_code: "CRM-502", reason, path }, "Twenty CRM unreachable");
    throw appError("CRM-502", `Service ${reason}.`);
  } finally {
    clearTimeout(timer);
  }
}

export type CrmPersonInput = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
};

/** Create a Person in Twenty. Returns the new id (null if Twenty omits it). */
export async function createPerson(input: CrmPersonInput): Promise<string | null> {
  const body: Record<string, unknown> = {
    name: { firstName: input.firstName, lastName: input.lastName ?? "" }
  };
  if (input.email) body.emails = { primaryEmail: input.email };
  if (input.phone) body.phones = { primaryPhoneNumber: input.phone };
  if (input.jobTitle) body.jobTitle = input.jobTitle;
  if (input.companyName) body.city = undefined; // company linkage is workspace-specific; left to Twenty rules
  return extractId(await twentyPost("/rest/people", body));
}

export type CrmOpportunityInput = {
  name: string;
  pointOfContactId?: string | null;
  amount?: number;
  stage?: string;
};

/** Create an Opportunity in Twenty (the proposal/RFQ). Returns the new id. */
export async function createOpportunity(input: CrmOpportunityInput): Promise<string | null> {
  const body: Record<string, unknown> = { name: input.name };
  if (input.pointOfContactId) body.pointOfContactId = input.pointOfContactId;
  if (typeof input.amount === "number") body.amount = { amountMicros: Math.round(input.amount * 1_000_000), currencyCode: "USD" };
  if (input.stage) body.stage = input.stage;
  return extractId(await twentyPost("/rest/opportunities", body));
}
