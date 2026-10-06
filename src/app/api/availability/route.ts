import { NextResponse } from "next/server";
import { handleRoute } from "@/lib/api-route";
import { parseUtcDateTime } from "@/lib/date-time";
import { DomainError } from "@/lib/domain-error";
import { listAvailability } from "@/server/reservations/list-availability";

export function GET(request: Request): Promise<NextResponse> {
  return handleRoute("Availability could not be loaded.", async () => {
    const params = new URL(request.url).searchParams;
    const locationId = params.get("locationId") ?? "";
    const startAt = parseUtcDateTime(params.get("startAt") ?? "");
    const endAt = parseUtcDateTime(params.get("endAt") ?? "");

    if (!locationId || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new DomainError("locationId, startAt and endAt are required.", 400, "VALIDATION_ERROR");
    }

    if (endAt <= startAt) {
      throw new DomainError("endAt must be after startAt.", 400, "VALIDATION_ERROR");
    }

    const availability = await listAvailability({
      locationId,
      startAt,
      endAt,
      excludeReservationId: params.get("excludeReservationId") ?? undefined,
    });
    return NextResponse.json({ availability });
  });
}
