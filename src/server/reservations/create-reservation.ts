import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";
import { parseUtcDateTime, type CreateReservationInput } from "@/schemas/create-reservation";
import { checkAvailability, formatShortfallMessage } from "./availability";

export async function createReservation(input: CreateReservationInput): Promise<{ id: string }> {
  const startAt = parseUtcDateTime(input.startAt);
  const endAt = parseUtcDateTime(input.endAt);

  // The availability check and the insert share one transaction so a confirmed
  // reservation is never written against a stale availability read.
  return prisma.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: input.locationId },
      select: { id: true },
    });

    if (!location) {
      throw new DomainError("Location was not found.", 404, "LOCATION_NOT_FOUND");
    }

    const equipmentIds = input.items.map((item) => item.equipmentId);
    const equipmentCount = await tx.equipment.count({
      where: { id: { in: equipmentIds }, locationId: input.locationId },
    });

    if (equipmentCount !== new Set(equipmentIds).size) {
      throw new DomainError(
        "Equipment was not found at the selected location.",
        404,
        "EQUIPMENT_NOT_FOUND",
      );
    }

    // Drafts do not consume inventory, so only confirmations are checked.
    if (input.status === "CONFIRMED") {
      const shortfalls: string[] = [];

      for (const item of input.items) {
        const result = await checkAvailability({
          locationId: input.locationId,
          equipmentId: item.equipmentId,
          startAt,
          endAt,
          requestedQuantity: item.quantity,
          db: tx,
        });

        if (!result.available) {
          shortfalls.push(formatShortfallMessage(result.equipmentName, result.availableQuantity));
        }
      }

      if (shortfalls.length > 0) {
        throw new DomainError(shortfalls.join(" "), 409, "INSUFFICIENT_AVAILABILITY");
      }
    }

    const reservation = await tx.reservation.create({
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

    return reservation;
  });
}
