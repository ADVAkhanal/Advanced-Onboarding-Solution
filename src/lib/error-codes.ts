import { HttpError } from "./http";

/**
 * Application error-code catalog — MODULE-CODE → { status, message }.
 *
 * Per the engineering guideline: errors are predictable, greppable, and
 * carry a stable machine code plus a human-readable message. `appError()`
 * produces an HttpError whose `.code` is the MODULE-CODE, so handleRouteError
 * already serializes it as { ok:false, error:{ code:"CRM-502", message } }.
 *
 * This catalog is additive: existing routes keep their string codes; new
 * integration/shipping code uses these so the codes stay documented in one
 * place (docs/error-codes.md) and surfaced to clients consistently.
 *
 * Never put secrets, tokens, or customer data in a message — codes are safe
 * to show users and log.
 */
export const ERROR_CODES = {
  // Auth & request
  "AUTH-401": { status: 401, message: "Authentication required." },
  "AUTH-403": { status: 403, message: "You do not have permission to perform this action." },
  "REQ-404": { status: 404, message: "The requested resource was not found." },
  "REQ-422": { status: 422, message: "The request is missing required fields or contains invalid values." },

  // Integration bridges (env-gated; disabled by default)
  "INTEG-503": { status: 503, message: "This integration is not configured. Set its environment variables to enable it." },
  "INTEG-502": { status: 502, message: "The external integration returned an error or was unreachable." },

  // Twenty CRM bridge
  "CRM-503": { status: 503, message: "Twenty CRM is not configured (set TWENTY_API_URL and TWENTY_API_KEY)." },
  "CRM-502": { status: 502, message: "Twenty CRM rejected the request or was unreachable." },

  // Papermark document/proposal bridge
  "DOC-503": { status: 503, message: "Papermark is not configured (set PAPERMARK_API_URL and PAPERMARK_API_KEY)." },
  "DOC-502": { status: 502, message: "Papermark rejected the request or was unreachable." },

  // Shipment notifications (ShipNotify)
  "SHIP-404": { status: 404, message: "Shipment notification not found or its link has expired." },
  "SHIP-409": { status: 409, message: "This shipment was already confirmed — confirmations are idempotent." },
  "SHIP-422": { status: 422, message: "Shipment notification data is incomplete." },

  // Server
  "SRV-500": { status: 500, message: "Unexpected server error." }
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Build an HttpError from a catalog code. Optional `detail` is appended to the
 * canonical message for context (keep it non-sensitive — it reaches clients).
 */
export function appError(code: ErrorCode, detail?: string): HttpError {
  const def = ERROR_CODES[code];
  const message = detail ? `${def.message} ${detail}` : def.message;
  return new HttpError(def.status, message, code);
}

export type ErrorCodeDef = { code: ErrorCode; status: number; message: string; module: string };

/** Flat list for the docs page / error-codes documentation. */
export function errorCodeList(): ErrorCodeDef[] {
  return (Object.entries(ERROR_CODES) as [ErrorCode, { status: number; message: string }][]).map(
    ([code, def]) => ({ code, status: def.status, message: def.message, module: code.split("-")[0] })
  );
}
