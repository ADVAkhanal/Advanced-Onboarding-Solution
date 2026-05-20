import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "authorization",
      "cookie",
      "headers.cookie",
      "token",
      "*.password",
      "*.passwordHash",
      "*.authorization",
      "*.cookie",
      "*.token"
    ],
    censor: "[redacted]"
  }
});
