/**
 * Read-only ProShop GraphQL client.
 *
 * ProShop is the system of record; this client only reads. It is fully
 * env-gated and disabled by default — with no PROSHOP_* env set,
 * isProShopConfigured() is false and nothing reaches the network.
 *
 * Credentials live ONLY in environment variables, never in code:
 *   PROSHOP_ROOT          e.g. https://yourshop.proshoperp.com
 *   PROSHOP_API_TOKEN     a bearer token (simplest), OR
 *   PROSHOP_CLIENT_ID + PROSHOP_CLIENT_SECRET  (client_credentials)
 *   PROSHOP_SCOPE         optional OAuth scope
 *
 * Pattern adapted from the proven IT-Dashboard integration: POST
 * {root}/api/graphql with a Bearer token. Field selection is minimized
 * per NIST 800-171 3.1.2.
 */

type ProShopConfig = {
  root: string;
  token?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
};

export function proshopConfig(): ProShopConfig | null {
  const root = process.env.PROSHOP_ROOT?.trim();
  if (!root) return null;
  const token = process.env.PROSHOP_API_TOKEN?.trim();
  const clientId = process.env.PROSHOP_CLIENT_ID?.trim();
  const clientSecret = process.env.PROSHOP_CLIENT_SECRET?.trim();
  if (!token && !(clientId && clientSecret)) return null;
  return {
    root: root.replace(/\/+$/, ""),
    token,
    clientId,
    clientSecret,
    scope: process.env.PROSHOP_SCOPE?.trim()
  };
}

export function isProShopConfigured(): boolean {
  return proshopConfig() !== null;
}

const FETCH_TIMEOUT_MS = 12_000;

// Cached client-credentials token (when not using a static PROSHOP_API_TOKEN).
let cachedToken: { value: string; expiresAt: number } | null = null;

const OAUTH_PATHS = [
  "/home/member/oauth/accesstoken",
  "/api/oauth/accesstoken",
  "/oauth/token",
  "/api/token"
];

async function resolveToken(cfg: ProShopConfig): Promise<string> {
  if (cfg.token) return cfg.token;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error("ProShop is not configured for client_credentials.");
  }
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    ...(cfg.scope ? { scope: cfg.scope } : {})
  });
  let lastStatus = 0;
  for (const path of OAUTH_PATHS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${cfg.root}${path}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        cache: "no-store",
        signal: controller.signal
      });
      lastStatus = res.status;
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (data.access_token) {
        const value = String(data.access_token);
        const expiresIn = Number(data.expires_in || 3600);
        cachedToken = { value, expiresAt: Date.now() + expiresIn * 1000 };
        return value;
      }
    } catch {
      // try next path
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`ProShop OAuth did not return a token (last status ${lastStatus}).`);
}

export type GraphQLResult<T> = { data: T | null; error: string | null };

export async function proshopGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<GraphQLResult<T>> {
  const cfg = proshopConfig();
  if (!cfg) return { data: null, error: "ProShop is not configured." };

  let token: string;
  try {
    token = await resolveToken(cfg);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Token error." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.root}/api/graphql`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: controller.signal
    });
    const text = await res.text();
    if (!res.ok) return { data: null, error: `ProShop returned HTTP ${res.status}.` };
    let parsed: { data?: T; errors?: Array<{ message?: string }> };
    try {
      parsed = JSON.parse(text) as { data?: T; errors?: Array<{ message?: string }> };
    } catch {
      return { data: null, error: "ProShop returned a non-JSON response." };
    }
    if (parsed.errors && parsed.errors.length) {
      return { data: null, error: parsed.errors.map((e) => e.message).filter(Boolean).join("; ") };
    }
    return { data: (parsed.data ?? null) as T | null, error: null };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { data: null, error: aborted ? "ProShop request timed out." : "Failed to reach ProShop." };
  } finally {
    clearTimeout(timer);
  }
}
