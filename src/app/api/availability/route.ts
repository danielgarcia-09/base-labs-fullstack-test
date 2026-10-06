import { NextResponse } from "next/server";
import { DomainError } from "@/lib/domain-error";
import { parseUtcDateTime } from "@/schemas/create-reservation";
import { listAvailability } from "@/server/reservations/list-availability";

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const locationId = params.get("locationId") ?? "";
  const startAt = parseUtcDateTime(params.get("startAt") ?? "");
  const endAt = parseUtcDateTime(params.get("endAt") ?? "");

  if (!locationId || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json(
      { error: "locationId, startAt and endAt are required.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (endAt <= startAt) {
    return NextResponse.json(
      { error: "endAt must be after startAt.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const availability = await listAvailability({
      locationId,
      startAt,
      endAt,
      excludeReservationId: params.get("excludeReservationId") ?? undefined,
    });
    return NextResponse.json({ availability });
  } catch (error: unknown) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    console.error("Unexpected availability error", error);
    return NextResponse.json(
      { error: "Availability could not be loaded.", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
