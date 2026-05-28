// Server-side gating logic of the SOP answerer. We don't call Claude here —
// we reach into the answerer's own thresholds and assert the rules.
import { describe, expect, it } from "vitest";
import { __testHooks } from "@/lib/ai/sop-answerer";

describe("SOP answerer gates", () => {
  it("requires confidence at or above the floor", () => {
    expect(__testHooks.CONFIDENCE_FLOOR).toBeGreaterThanOrEqual(0.6);
    expect(__testHooks.CONFIDENCE_FLOOR).toBeLessThanOrEqual(0.9);
  });

  it("caps question length to prevent runaway prompts", () => {
    expect(__testHooks.MAX_QUESTION_CHARS).toBeGreaterThan(500);
    expect(__testHooks.MAX_QUESTION_CHARS).toBeLessThanOrEqual(10_000);
  });

  it("system prompt explicitly forbids ungrounded answers", () => {
    expect(__testHooks.SYSTEM_PROMPT).toMatch(/ONLY/);
    expect(__testHooks.SYSTEM_PROMPT).toMatch(/cite/i);
    expect(__testHooks.SYSTEM_PROMPT).toMatch(/NULL/);
  });

  it("tool schema requires citations and triggers", () => {
    const schema = __testHooks.TOOL.input_schema as { required: string[]; properties: Record<string, unknown> };
    expect(schema.required).toContain("answer_or_null");
    expect(schema.required).toContain("citations");
    expect(schema.required).toContain("confidence");
    expect(schema.required).toContain("triggers");
  });
});
