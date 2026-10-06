import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import { parseUtcDateTime, type UpdateReservationInput } from "@/schemas/create-reservation";
import { assertConfirmedAvailability, assertLocationAndEquipment } from "./reservation-rules";

export async function updateReservation(
  reservationId: string,
  input: UpdateReservationInput,
): Promise<{ id: string }> {
  const startAt = parseUtcDateTime(input.startAt);
  const endAt = parseUtcDateTime(input.endAt);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: { startAt: true },
    });

    if (!existing) {
      throw new DomainError("Reservation not found.", 404, "RESERVATION_NOT_FOUND");
    }

    // A reservation that already started may be edited, but its start cannot be moved
    // into the past.
    const currentMinute = new Date();
    currentMinute.setUTCSeconds(0, 0);

    if (startAt < currentMinute && startAt.getTime() !== existing.startAt.getTime()) {
      throw new DomainError("Start time cannot be in the past.", 400, "START_IN_PAST");
    }

    await assertLocationAndEquipment(tx, {
      locationId: input.locationId,
      equipmentIds: input.items.map((item) => item.equipmentId),
    });

    // The reservation being edited is excluded so it never conflicts with itself.
    if (input.status === "CONFIRMED") {
      await assertConfirmedAvailability(tx, {
        locationId: input.locationId,
        startAt,
        endAt,
        items: input.items,
        excludeReservationId: reservationId,
      });
    }

    // Items are replaced wholesale; the internal note is left untouched.
    await tx.reservationItem.deleteMany({ where: { reservationId } });

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        locationId: input.locationId,
        startAt,
        endAt,
        status: input.status,
        items: {
          create: input.items.map((item) => ({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
          })),
        },
      },
      select: { id: true },
    });
  });
}
