import { describe, expect, it } from "vitest";
import { redactProhibited } from "@/lib/ai/redaction";

describe("AI payload redaction", () => {
  it("strips SSNs before they leave the system", () => {
    const out = redactProhibited("Employee SSN is 123-45-6789, please update.");
    expect(out.redactedText).not.toContain("123-45-6789");
    expect(out.redactedText).toContain("[REDACTED:SSN]");
    expect(out.applied).toContain("ssn");
  });

  it("redacts credit card numbers", () => {
    const out = redactProhibited("Customer paid with 4242 4242 4242 4242");
    expect(out.redactedText).not.toContain("4242 4242 4242 4242");
    expect(out.applied).toContain("credit_card");
  });

  it("redacts API keys and password assignments", () => {
    const out = redactProhibited("env: api_x123abcDEF456ghIJKLmn7890 and password=Hunter2!");
    expect(out.applied).toContain("api_key");
    expect(out.applied).toContain("password");
    expect(out.redactedText).toContain("[REDACTED:APIKEY]");
    expect(out.redactedText).toContain("[REDACTED:PASSWORD]");
  });

  it("redacts email addresses and phone numbers", () => {
    const out = redactProhibited("Reach me at akhanal@example.com or 555-867-5309.");
    expect(out.redactedText).not.toContain("akhanal@example.com");
    expect(out.redactedText).not.toContain("555-867-5309");
    expect(out.applied).toContain("email_address");
    expect(out.applied).toContain("phone_number");
  });

  it("returns the original text unchanged when nothing matches", () => {
    const out = redactProhibited("How do I run the FAI process for a new part?");
    expect(out.applied.length).toBe(0);
    expect(out.redactedText).toBe("How do I run the FAI process for a new part?");
  });
});
