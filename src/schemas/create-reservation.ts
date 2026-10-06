import { z } from "zod";

const TIMEZONE_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parses a form `datetime-local` value ("2027-09-20T09:00") or an ISO string.
 * Values without an explicit offset are interpreted as UTC, matching how the
 * app displays every time.
 */
export function parseUtcDateTime(value: string): Date {
  const trimmed = value.trim();
  return new Date(TIMEZONE_SUFFIX.test(trimmed) ? trimmed : `${trimmed}Z`);
}

function dateTimeField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => !Number.isNaN(parseUtcDateTime(value).getTime()), `Enter a valid ${label.toLowerCase()}.`);
}

export const reservationItemSchema = z.object({
  equipmentId: z.string().min(1, "Select equipment."),
  quantity: z
    .number({ error: "Enter a quantity." })
    .int("Quantity must be a whole number.")
    .positive("Quantity must be greater than zero."),
});

export const createReservationSchema = z
  .object({
    locationId: z.string().min(1, "Select a location."),
    startAt: dateTimeField("Start time"),
    endAt: dateTimeField("End time"),
    status: z.enum(["DRAFT", "CONFIRMED"]),
    items: z.array(reservationItemSchema).min(1, "Add at least one equipment item."),
  })
  .superRefine((value, ctx) => {
    const startAt = parseUtcDateTime(value.startAt);
    const endAt = parseUtcDateTime(value.endAt);

    // Compare against the current minute: pickers only have minute precision.
    const currentMinute = new Date();
    currentMinute.setUTCSeconds(0, 0);

    if (startAt < currentMinute) {
      ctx.addIssue({ code: "custom", path: ["startAt"], message: "Start time cannot be in the past." });
    }

    if (endAt <= startAt) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
    }

    const seen = new Set<string>();
    value.items.forEach((item, index) => {
      if (item.equipmentId && seen.has(item.equipmentId)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "equipmentId"],
          message: "Each equipment type can only be added once.",
        });
      }
      seen.add(item.equipmentId);
    });
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
