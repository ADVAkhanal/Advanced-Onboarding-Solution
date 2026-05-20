import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("/api/health", () => {
  it("returns service health without authentication", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.appName).toBe("CleanOps Command Center");
    expect(payload).toHaveProperty("databaseConnected");
    expect(payload).toHaveProperty("pushoverEnabled");
  });
});
