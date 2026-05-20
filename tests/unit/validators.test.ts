import { describe, expect, it } from "vitest";
import { payrollCreateSchema, ticketCreateSchema } from "@/lib/validators";

describe("server validation", () => {
  it("accepts safe ticket intake fields", () => {
    const parsed = ticketCreateSchema.parse({
      departmentId: "dept_1",
      ticketCenterId: "center_1",
      title: "Coolant system needs review",
      description: "The CNC-12 coolant flow is below the expected operating range.",
      priority: "HIGH"
    });

    expect(parsed.priority).toBe("HIGH");
  });

  it("requires a business reason for payroll coordination", () => {
    const result = payrollCreateSchema.safeParse({
      departmentId: "dept_1",
      requestType: "pay rate change",
      proposedChangeSummary: "Increase hourly rate",
      businessReason: ""
    });

    expect(result.success).toBe(false);
  });
});
