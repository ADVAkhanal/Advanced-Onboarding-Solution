import { describe, expect, it } from "vitest";
import { can, permissionsForLevel } from "@/lib/permissions";

describe("role permission boundaries", () => {
  it("keeps level 1 users out of executive reports and admin settings", () => {
    expect(can("LEVEL_1", "ticket:create")).toBe(true);
    expect(can("LEVEL_1", "admin:manage")).toBe(false);
    expect(can("LEVEL_1", "report:export")).toBe(false);
    expect(can("LEVEL_1", "payroll:export")).toBe(false);
  });

  it("allows managers to coordinate payroll but not export payroll", () => {
    expect(can("MANAGER", "payroll:create")).toBe(true);
    expect(can("MANAGER", "payroll:export")).toBe(false);
  });

  it("gives global admins the full permission set", () => {
    expect(permissionsForLevel("GLOBAL_ADMIN")).toContain("admin:manage");
    expect(permissionsForLevel("GLOBAL_ADMIN")).toContain("audit:view");
    expect(permissionsForLevel("GLOBAL_ADMIN")).toContain("payroll:export");
  });
});
