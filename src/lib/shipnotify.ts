import { randomBytes } from "crypto";

/**
 * ShipNotify helpers — per-shipment confirmation loop.
 *
 * A shipment gets an opaque, unguessable confirm token (144 bits). The token is
 * embedded as a QR on the printed packing slip; the recipient scans it and
 * confirms receipt on a public page (no login). Confirmation fires an internal
 * alert back to the shop. The token is the only thing exposed publicly and
 * carries no sensitive data — it just resolves to one shipment.
 */
export function newConfirmToken(): string {
  return randomBytes(18).toString("base64url");
}

export function confirmPath(token: string): string {
  return `/s/${token}`;
}

/**
 * Public base URL for building the confirm link. Prefers an explicit env var
 * (set on Railway), else derives it from the request's forwarded host/proto.
 */
export function publicBaseUrl(request: Request): string {
  const env = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;
  try {
    const url = new URL(request.url);
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
    const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
    return `${proto}://${host}`;
  } catch {
    return "";
  }
}

export function confirmUrl(request: Request, token: string): string {
  return `${publicBaseUrl(request)}${confirmPath(token)}`;
}
