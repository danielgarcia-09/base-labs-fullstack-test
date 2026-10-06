import { z } from "zod";
import { currentUtcMinute, parseUtcDateTime } from "@/lib/date-time";

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

const reservationFieldsSchema = z.object({
  locationId: z.string().min(1, "Select a location."),
  startAt: dateTimeField("Start time"),
  endAt: dateTimeField("End time"),
  status: z.enum(["DRAFT", "CONFIRMED"]),
  items: z.array(reservationItemSchema).min(1, "Add at least one equipment item."),
});

type ReservationFields = z.infer<typeof reservationFieldsSchema>;
type AddIssue = (path: Array<string | number>, message: string) => void;

function validateReservation(value: ReservationFields, addIssue: AddIssue, options: { allowPastStart: boolean }) {
  const startAt = parseUtcDateTime(value.startAt);
  const endAt = parseUtcDateTime(value.endAt);

  // Compare against the current minute: pickers only have minute precision.
  if (!options.allowPastStart && startAt < currentUtcMinute()) {
    addIssue(["startAt"], "Start time cannot be in the past.");
  }

  if (endAt <= startAt) {
    addIssue(["endAt"], "End time must be after start time.");
  }

  const seen = new Set<string>();
  value.items.forEach((item, index) => {
    if (item.equipmentId && seen.has(item.equipmentId)) {
      addIssue(["items", index, "equipmentId"], "Each equipment type can only be added once.");
    }
    seen.add(item.equipmentId);
  });
}

export const createReservationSchema = reservationFieldsSchema.superRefine((value, ctx) =>
  validateReservation(value, (path, message) => ctx.addIssue({ code: "custom", path, message }), {
    allowPastStart: false,
  }),
);

/**
 * Editing may keep a start time that has already passed (for example to change the
 * status of a reservation in progress). The server rejects a *changed* start in the past.
 */
export const updateReservationSchema = reservationFieldsSchema.superRefine((value, ctx) =>
  validateReservation(value, (path, message) => ctx.addIssue({ code: "custom", path, message }), {
    allowPastStart: true,
  }),
);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
