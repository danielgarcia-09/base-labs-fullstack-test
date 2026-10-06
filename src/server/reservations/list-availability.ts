import { prisma } from "@/lib/prisma";
import { getAvailableQuantity } from "./availability";

/** Available quantity per equipment ID at a location for the given [startAt, endAt) period. */
export async function listAvailability(input: {
  locationId: string;
  startAt: Date;
  endAt: Date;
}): Promise<Record<string, number>> {
  const equipment = await prisma.equipment.findMany({
    where: { locationId: input.locationId },
    select: { id: true },
  });

  const quantities = await Promise.all(
    equipment.map(async ({ id }) => [id, await getAvailableQuantity({ ...input, equipmentId: id })] as const),
  );

  return Object.fromEntries(quantities);
}
