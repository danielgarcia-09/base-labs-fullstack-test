import { parseUtcDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import type { CreateReservationInput } from "@/schemas/create-reservation";
import { assertConfirmedAvailability, assertLocationAndEquipment } from "./reservation-rules";

export async function createReservation(input: CreateReservationInput): Promise<{ id: string }> {
  const startAt = parseUtcDateTime(input.startAt);
  const endAt = parseUtcDateTime(input.endAt);

  // The availability check and the insert share one transaction so a confirmed
  // reservation is never written against a stale availability read.
  return prisma.$transaction(async (tx) => {
    await assertLocationAndEquipment(tx, {
      locationId: input.locationId,
      equipmentIds: input.items.map((item) => item.equipmentId),
    });

    // Drafts do not consume inventory, so only confirmations are checked.
    if (input.status === "CONFIRMED") {
      await assertConfirmedAvailability(tx, {
        locationId: input.locationId,
        startAt,
        endAt,
        items: input.items,
      });
    }

    return tx.reservation.create({
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
