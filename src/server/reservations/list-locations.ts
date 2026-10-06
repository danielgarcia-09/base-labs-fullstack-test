import { prisma } from "@/lib/prisma";
import type { LocationOption } from "@/types/reservation";

export async function listLocationOptions(): Promise<LocationOption[]> {
  return prisma.location.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      equipment: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, totalQuantity: true },
      },
    },
  });
}
