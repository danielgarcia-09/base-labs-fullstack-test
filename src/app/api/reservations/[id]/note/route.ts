import { NextResponse } from "next/server";
import { handleRoute, parseBody } from "@/lib/api-route";
import { reservationNoteSchema } from "@/schemas/reservation-note";
import { updateReservationNote } from "@/server/reservations/update-reservation-note";

export function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return handleRoute("The note could not be saved. Please try again.", async () => {
    const input = await parseBody(request, reservationNoteSchema);
    const { id } = await context.params;
    const reservation = await updateReservationNote(id, input);
    return NextResponse.json({ reservation });
  });
}
