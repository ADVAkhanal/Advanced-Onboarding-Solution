import { describe, expect, it } from "vitest";
import { can, permissionsForLevel } from "@/lib/permissions";

describe("SOP + AI + quiz permissions", () => {
  it("level 1 users can ask the SOP assistant and take quizzes only", () => {
    expect(can("USER", "sop:ask")).toBe(true);
    expect(can("USER", "ai:use")).toBe(true);
    expect(can("USER", "quiz:take")).toBe(true);
    expect(can("USER", "sop:author")).toBe(false);
    expect(can("USER", "sop:approve")).toBe(false);
    expect(can("USER", "quiz:author")).toBe(false);
    expect(can("USER", "quiz:launch")).toBe(false);
    expect(can("USER", "ai:audit")).toBe(false);
  });

  it("managers can author SOPs and resolve escalations but not approve SOPs", () => {
    expect(can("MANAGER", "sop:author")).toBe(true);
    expect(can("MANAGER", "sop:escalation:resolve")).toBe(true);
    expect(can("MANAGER", "sop:approve")).toBe(false);
    expect(can("MANAGER", "quiz:launch")).toBe(true);
    expect(can("MANAGER", "quiz:insights")).toBe(true);
  });

  it("directors can approve SOPs and view AI audit", () => {
    expect(can("DIRECTOR", "sop:approve")).toBe(true);
    expect(can("DIRECTOR", "ai:audit")).toBe(true);
  });

  it("admins hold every SOP/AI/quiz permission", () => {
    const perms = permissionsForLevel("ADMIN");
    for (const key of [
      "sop:ask",
      "sop:author",
      "sop:approve",
      "sop:admin",
      "sop:escalation:resolve",
      "ai:use",
      "ai:audit",
      "quiz:take",
      "quiz:launch",
      "quiz:author",
      "quiz:insights",
      "quiz:admin"
    ] as const) {
      expect(perms).toContain(key);
    }
  });
});
