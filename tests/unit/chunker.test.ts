import { describe, expect, it } from "vitest";
import { chunkSopText } from "@/lib/ai/chunker";

describe("SOP chunker", () => {
  it("emits chunks with their heading path attached", () => {
    const sop = `# Quality Operations\n\n## 3 First-Piece Inspection\n\nThe FAI process begins with operator verification of setup. The first piece is measured on the CMM before run authorization.\n\n## 4 Calibration\n\nAll measurement equipment must be within calibration date.`;
    const chunks = chunkSopText({ rawText: sop, targetTokens: 60 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].headingPath).toContain("First-Piece");
    expect(chunks[0].content.length).toBeGreaterThan(0);
    const calibration = chunks.find((c) => c.headingPath.includes("Calibration"));
    expect(calibration).toBeTruthy();
  });

  it("returns an empty list for empty input", () => {
    expect(chunkSopText({ rawText: "" })).toEqual([]);
  });

  it("does not emit a chunk for heading-only content", () => {
    const chunks = chunkSopText({ rawText: "# Title only\n## Sub heading\n" });
    expect(chunks.length).toBe(0);
  });
});
