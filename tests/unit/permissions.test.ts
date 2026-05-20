import { describe, expect, it } from "vitest";
import { can, permissionsForLevel } from "@/lib/permissions";

describe("role permission boundaries", () => {
  it("keeps level 1 users out of executive reports and admin settings", () => {
    expect(can("USER", "ticket:create")).toBe(true);
    expect(can("USER", "admin:manage")).toBe(false);
    expect(can("USER", "report:export")).toBe(false);
    expect(can("USER", "payroll:export")).toBe(false);
  });

  it("allows managers to coordinate payroll but not export payroll", () => {
    expect(can("MANAGER", "payroll:create")).toBe(true);
    expect(can("MANAGER", "payroll:export")).toBe(false);
  });

  it("gives global admins the full permission set", () => {
    expect(permissionsForLevel("ADMIN")).toContain("admin:manage");
    expect(permissionsForLevel("ADMIN")).toContain("audit:view");
    expect(permissionsForLevel("ADMIN")).toContain("payroll:export");
  });
});
