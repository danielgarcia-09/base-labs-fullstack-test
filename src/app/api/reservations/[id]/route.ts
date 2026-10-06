import { NextResponse } from "next/server";
import { handleRoute, parseBody } from "@/lib/api-route";
import { updateReservationSchema } from "@/schemas/create-reservation";
import { updateReservation } from "@/server/reservations/update-reservation";

export function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  return handleRoute("The reservation could not be saved. Please try again.", async () => {
    const input = await parseBody(request, updateReservationSchema);
    const { id } = await context.params;
    const reservation = await updateReservation(id, input);
    return NextResponse.json({ reservation });
  });
}
