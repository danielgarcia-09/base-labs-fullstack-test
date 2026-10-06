import { NextResponse } from "next/server";
import type { z } from "zod";
import { DomainError } from "@/lib/domain-error";

/**
 * Runs a route handler and turns thrown errors into JSON responses: `DomainError`s keep
 * their status and code, anything else is logged and returned as a generic 500.
 */
export async function handleRoute(
  fallbackMessage: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    console.error(fallbackMessage, error);
    return NextResponse.json({ error: fallbackMessage, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/** Reads the JSON body and validates it; failures throw a 400 `DomainError`. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("Request body must be valid JSON.", 400, "INVALID_JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid request.", 400, "VALIDATION_ERROR");
  }

  return parsed.data;
}
