import { NextResponse } from "next/server";
import { handleRoute, parseBody } from "@/lib/api-route";
import { createReservationSchema } from "@/schemas/create-reservation";
import { createReservation } from "@/server/reservations/create-reservation";

export function POST(request: Request): Promise<NextResponse> {
  return handleRoute("The reservation could not be created. Please try again.", async () => {
    const input = await parseBody(request, createReservationSchema);
    const reservation = await createReservation(input);
    return NextResponse.json({ reservation }, { status: 201 });
  });
}
