import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "request_error"
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, message: string, code = "request_error") {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof HttpError) {
    return fail(error.status, error.message, error.code);
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "validation_error",
          message: "The request is missing required fields or contains invalid values.",
          issues: error.flatten()
        }
      },
      { status: 422 }
    );
  }

  logger.error({ error }, "Unhandled route error");
  const message = process.env.NODE_ENV === "production" ? "Unexpected server error." : error instanceof Error ? error.message : "Unexpected server error.";
  return fail(500, message, "server_error");
}
