/**
 * Next.js instrumentation hook — runs once when the server starts.
 * Used for fail-soft environment validation so misconfiguration shows up
 * in the logs immediately on a Railway deploy.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/env");
    validateEnv();
  }
}
