// Out-of-scope redaction for AI payloads.
// Any text leaving the system to an AI provider passes through this first.
// See docs/data-boundaries.md and docs/ai-integration-policy.md.

export type RedactionClass =
  | "ssn"
  | "bank_routing"
  | "bank_account"
  | "credit_card"
  | "api_key"
  | "secret"
  | "password"
  | "email_address"
  | "phone_number";

export type RedactionReport = {
  applied: RedactionClass[];
  counts: Partial<Record<RedactionClass, number>>;
  redactedText: string;
};

type Rule = {
  cls: RedactionClass;
  pattern: RegExp;
  placeholder: string;
};

// Order matters: longer-matching/structurally-stricter rules first so they
// claim digits before looser numeric rules sweep them up.
const RULES: Rule[] = [
  // 16-digit card numbers (with optional spaces/dashes). Luhn not checked
  // because we only need to redact, not validate.
  {
    cls: "credit_card",
    pattern: /\b(?:\d[ -]?){15,16}\d\b/g,
    placeholder: "[REDACTED:CARD]"
  },
  // US SSN format: 9 digits or NNN-NN-NNNN.
  {
    cls: "ssn",
    pattern: /\b\d{3}[- ]\d{2}[- ]\d{4}\b/g,
    placeholder: "[REDACTED:SSN]"
  },
  // US bank routing numbers: ABA 9-digit, allow common dash/space variants.
  {
    cls: "bank_routing",
    pattern: /\b(?:routing|aba)[^\d]{0,20}(\d[ -]?){8}\d\b/gi,
    placeholder: "[REDACTED:ROUTING]"
  },
  // Bank account numbers near the word "account" — 7+ digits.
  {
    cls: "bank_account",
    pattern: /\b(?:account|acct)[^\d]{0,20}(\d[ -]?){6,16}\d\b/gi,
    placeholder: "[REDACTED:ACCOUNT]"
  },
  // Typical API key / token shapes.
  {
    cls: "api_key",
    pattern: /\b(?:sk|pk|api|tok|key)[_-][A-Za-z0-9]{16,}\b/g,
    placeholder: "[REDACTED:APIKEY]"
  },
  // "password = abc123" style.
  {
    cls: "password",
    pattern: /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/gi,
    placeholder: "[REDACTED:PASSWORD]"
  },
  // Generic long opaque secrets that look like base64/hex.
  {
    cls: "secret",
    pattern: /\b(?:[A-Za-z0-9+/_-]{32,}={0,2})\b/g,
    placeholder: "[REDACTED:SECRET]"
  },
  // Email addresses — we strip these from AI-bound payloads by default to
  // minimize the chance of personal-identifier leakage in prompts/logs.
  {
    cls: "email_address",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    placeholder: "[REDACTED:EMAIL]"
  },
  // US-style phone numbers.
  {
    cls: "phone_number",
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    placeholder: "[REDACTED:PHONE]"
  }
];

export function redactProhibited(input: string): RedactionReport {
  const counts: Partial<Record<RedactionClass, number>> = {};
  let text = input;

  for (const rule of RULES) {
    text = text.replace(rule.pattern, (match) => {
      counts[rule.cls] = (counts[rule.cls] ?? 0) + 1;
      return rule.placeholder + (match.endsWith(" ") ? " " : "");
    });
  }

  return {
    applied: Object.keys(counts) as RedactionClass[],
    counts,
    redactedText: text
  };
}

export function hashQuestion(input: string): string {
  // Lightweight content hash for dedupe / rate limiting without storing
  // the question. Not a security primitive.
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return `q_${(h >>> 0).toString(36)}_${input.length}`;
}
