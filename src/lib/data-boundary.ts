import { HttpError } from "./http";

const prohibitedKeyFragments = [
  "ssn",
  "socialsecurity",
  "bank",
  "routing",
  "accountnumberbank",
  "creditcard",
  "cardnumber",
  "cui",
  "itar",
  "medical",
  "phi",
  "taxcredential",
  "payrollpassword",
  "password",
  "apikey",
  "api_key",
  "secret",
  "token"
];

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function assertNoProhibitedFields(input: unknown) {
  if (!input || typeof input !== "object") {
    return;
  }

  const stack: unknown[] = [input];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") {
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const normalized = normalizeKey(key);
      if (prohibitedKeyFragments.some((fragment) => normalized.includes(fragment))) {
        throw new HttpError(
          422,
          "This request contains a prohibited sensitive field. Do not enter CUI, SSNs, banking details, card data, medical records, tax credentials, passwords, API keys, or secrets.",
          "data_boundary_violation"
        );
      }
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}
