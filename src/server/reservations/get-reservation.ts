import { toDateTimeLocalValue } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import type { ReservationEditValues } from "@/types/reservation";

/** Loads a reservation in the shape the reservation form uses (UTC "YYYY-MM-DDTHH:mm" times). */
export async function getReservationForEdit(id: string): Promise<ReservationEditValues | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      locationId: true,
      startAt: true,
      endAt: true,
      status: true,
      items: {
        orderBy: { equipment: { name: "asc" } },
        select: { equipmentId: true, quantity: true },
      },
    },
  });

  if (!reservation) {
    return null;
  }

  return {
    id: reservation.id,
    locationId: reservation.locationId,
    startAt: toDateTimeLocalValue(reservation.startAt),
    endAt: toDateTimeLocalValue(reservation.endAt),
    status: reservation.status,
    items: reservation.items,
  };
}
