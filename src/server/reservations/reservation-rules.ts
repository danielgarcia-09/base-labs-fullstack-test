import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/domain-error";
import { checkAvailability, formatShortfallMessage } from "./availability";

/** The location must exist and every equipment ID must belong to it. */
export async function assertLocationAndEquipment(
  tx: Prisma.TransactionClient,
  input: { locationId: string; equipmentIds: string[] },
): Promise<void> {
  const location = await tx.location.findUnique({
    where: { id: input.locationId },
    select: { id: true },
  });

  if (!location) {
    throw new DomainError("Location was not found.", 404, "LOCATION_NOT_FOUND");
  }

  const equipmentCount = await tx.equipment.count({
    where: { id: { in: input.equipmentIds }, locationId: input.locationId },
  });

  if (equipmentCount !== new Set(input.equipmentIds).size) {
    throw new DomainError(
      "Equipment was not found at the selected location.",
      404,
      "EQUIPMENT_NOT_FOUND",
    );
  }
}

/**
 * Throws a 409 listing every item that exceeds availability for the period.
 * Pass `excludeReservationId` when editing so a reservation never conflicts with itself.
 */
export async function assertConfirmedAvailability(
  tx: Prisma.TransactionClient,
  input: {
    locationId: string;
    startAt: Date;
    endAt: Date;
    items: Array<{ equipmentId: string; quantity: number }>;
    excludeReservationId?: string;
  },
): Promise<void> {
  const shortfalls: string[] = [];

  for (const item of input.items) {
    const result = await checkAvailability({
      locationId: input.locationId,
      equipmentId: item.equipmentId,
      startAt: input.startAt,
      endAt: input.endAt,
      requestedQuantity: item.quantity,
      excludeReservationId: input.excludeReservationId,
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
