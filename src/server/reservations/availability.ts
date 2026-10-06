import type { Prisma } from "@/generated/prisma/client";
import { DomainError } from "@/lib/domain-error";
import { prisma } from "@/lib/prisma";

interface AvailabilityInput {
  locationId: string;
  equipmentId: string;
  startAt: Date;
  endAt: Date;
  /** Reservation to ignore, so an edited reservation does not conflict with itself. */
  excludeReservationId?: string;
  /** Pass a transaction client to run the check inside the caller's transaction. */
  db?: Prisma.TransactionClient;
}

interface AvailabilityCheckInput extends AvailabilityInput {
  requestedQuantity: number;
}

interface EquipmentAvailability {
  equipmentName: string;
  availableQuantity: number;
}

async function getEquipmentAvailability(input: AvailabilityInput): Promise<EquipmentAvailability> {
  if (input.endAt <= input.startAt) {
    throw new DomainError("End time must be after start time.", 400, "INVALID_INTERVAL");
  }

  const db = input.db ?? prisma;
  const equipment = await db.equipment.findFirst({
    where: { id: input.equipmentId, locationId: input.locationId },
    select: { name: true, totalQuantity: true },
  });

  if (!equipment) {
    throw new DomainError(
      "Equipment was not found at the selected location.",
      404,
      "EQUIPMENT_NOT_FOUND",
    );
  }

  // Intervals are [start, end): two ranges overlap only when each starts strictly
  // before the other ends, so adjacent reservations do not conflict.
  const reservations = await db.reservation.findMany({
    where: {
      locationId: input.locationId,
      status: "CONFIRMED",
      startAt: { lt: input.endAt },
      endAt: { gt: input.startAt },
      ...(input.excludeReservationId ? { id: { not: input.excludeReservationId } } : {}),
      items: { some: { equipmentId: input.equipmentId } },
    },
    select: {
      items: {
        where: { equipmentId: input.equipmentId },
        select: { quantity: true },
      },
    },
  });

  const reservedQuantity = reservations.reduce(
    (sum, reservation) => sum + reservation.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );

  return {
    equipmentName: equipment.name,
    availableQuantity: Math.max(0, equipment.totalQuantity - reservedQuantity),
  };
}

export async function getAvailableQuantity(input: AvailabilityInput): Promise<number> {
  return (await getEquipmentAvailability(input)).availableQuantity;
}

export async function checkAvailability(
  input: AvailabilityCheckInput,
): Promise<{ available: boolean; availableQuantity: number; equipmentName: string }> {
  if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity <= 0) {
    throw new DomainError("Quantity must be a positive whole number.", 400, "INVALID_QUANTITY");
  }

  const { availableQuantity, equipmentName } = await getEquipmentAvailability(input);
  return {
    available: input.requestedQuantity <= availableQuantity,
    availableQuantity,
    equipmentName,
  };
}

/** e.g. "Only 2 Generators are available for the selected period." */
export function formatShortfallMessage(equipmentName: string, availableQuantity: number): string {
  if (availableQuantity === 0) {
    return `No ${equipmentName}s are available for the selected period.`;
  }

  return availableQuantity === 1
    ? `Only 1 ${equipmentName} is available for the selected period.`
    : `Only ${availableQuantity} ${equipmentName}s are available for the selected period.`;
}
