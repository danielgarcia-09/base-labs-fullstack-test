"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  createReservationSchema,
  updateReservationSchema,
  type CreateReservationInput,
} from "@/schemas/create-reservation";
import type { LocationOption, ReservationEditValues } from "@/types/reservation";

interface ApiErrorBody {
  error?: string;
  code?: string;
}

const EMPTY_ITEM = { equipmentId: "", quantity: 1 };
const AVAILABILITY_DEBOUNCE_MS = 1000;

/** Creates a reservation, or edits one when `reservation` is provided. */
export function ReservationForm({
  locations,
  minDateTime,
  reservation,
}: {
  locations: LocationOption[];
  /** Earliest selectable time as a UTC "YYYY-MM-DDTHH:mm" string (the current minute). */
  minDateTime: string;
  reservation?: ReservationEditValues;
}) {
  const now = minDateTime;
  const isEdit = reservation !== undefined;
  const router = useRouter();
  const [serverError, setServerError] = useState<{
    message: string;
    conflict: boolean;
  } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateReservationInput>({
    resolver: zodResolver(isEdit ? updateReservationSchema : createReservationSchema),
    defaultValues: reservation
      ? {
          locationId: reservation.locationId,
          startAt: reservation.startAt,
          endAt: reservation.endAt,
          status: reservation.status,
          items: reservation.items,
        }
      : {
          locationId: "",
          startAt: "",
          endAt: "",
          status: "DRAFT",
          items: [EMPTY_ITEM],
        },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items",
  });

  const locationId = useWatch({ control, name: "locationId" });
  const items = useWatch({ control, name: "items" });
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });
  // New reservations cannot start in the past. An edited one may keep a start that has
  // already passed, so its own start time stays selectable.
  const startMin = reservation && reservation.startAt < now ? reservation.startAt : now;
  const endMin = isEdit ? startAt || undefined : startAt && startAt > now ? startAt : now;
  const equipmentOptions =
    locations.find((location) => location.id === locationId)?.equipment ?? [];

  // Availability depends on the selected period, so it is fetched once location and
  // a valid interval are chosen. Results are keyed so stale responses are ignored.
  const [availability, setAvailability] = useState<{
    key: string;
    quantities: Record<string, number>;
  } | null>(null);
  const availabilityKey =
    locationId && startAt && endAt && endAt > startAt
      ? `${locationId}|${startAt}|${endAt}`
      : null;
  const reservationId = reservation?.id;

  useEffect(() => {
    if (!availabilityKey) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ locationId, startAt, endAt });
    // When editing, the reservation must not count against its own availability.
    if (reservationId) params.set("excludeReservationId", reservationId);

    // The date-time control emits a value as soon as the hour is picked, but the user may
    // still be choosing minutes, so wait for the value to settle before querying.
    const timer = setTimeout(() => {
      fetch(`/api/availability?${params}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { availability?: Record<string, number> } | null) => {
          if (body?.availability) {
            setAvailability({
              key: availabilityKey,
              quantities: body.availability,
            });
          }
        })
        .catch(() => undefined);
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [availabilityKey, locationId, startAt, endAt, reservationId]);

  const availableQuantities =
    availability && availability.key === availabilityKey
      ? availability.quantities
      : null;

  async function onSubmit(input: CreateReservationInput) {
    setServerError(null);

    try {
      const response = await fetch(
        reservation ? `/api/reservations/${reservation.id}` : "/api/reservations",
        {
          method: reservation ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const body = (await response.json()) as ApiErrorBody;

      if (!response.ok) {
        setServerError({
          message:
            body.error ??
            (isEdit
              ? "The reservation could not be saved."
              : "The reservation could not be created."),
          conflict: body.code === "INSUFFICIENT_AVAILABILITY",
        });
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setServerError({
        message: "The server could not be reached. Please try again.",
        conflict: false,
      });
    }
  }

  if (locations.length === 0) {
    return (
      <Alert severity="info">
        No locations are configured yet, so a reservation cannot be saved.
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={isEdit ? "Edit reservation" : "Create reservation"}
    >
      <Stack spacing={3}>
        {serverError ? (
          <Alert
            severity={serverError.conflict ? "warning" : "error"}
            role="alert"
          >
            {serverError.message}
          </Alert>
        ) : null}

        <Controller
          name="locationId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              required
              label="Location"
              disabled={isSubmitting}
              error={Boolean(errors.locationId)}
              helperText={errors.locationId?.message}
              onChange={(event) => {
                field.onChange(event);
                // Equipment is location-specific, so previous selections no longer apply.
                replace([EMPTY_ITEM]);
              }}
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            {...register("startAt")}
            type="datetime-local"
            label="Start time"
            required
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.startAt)}
            helperText={errors.startAt?.message ?? "UTC"}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: startMin, max: endAt || undefined },
            }}
          />
          <TextField
            {...register("endAt")}
            type="datetime-local"
            label="End time"
            required
            fullWidth
            disabled={isSubmitting}
            error={Boolean(errors.endAt)}
            helperText={
              errors.endAt?.message ?? "UTC · the end time is exclusive"
            }
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: endMin },
            }}
          />
        </Stack>

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              required
              label="Status"
              disabled={isSubmitting}
              helperText="Only confirmed reservations reserve equipment."
            >
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
            </TextField>
          )}
        />

        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
          <Typography component="legend" variant="h2" sx={{ mb: 1.5 }}>
            Equipment
          </Typography>
          <Stack spacing={2}>
            {fields.map((field, index) => {
              const selectedElsewhere = new Set(
                items
                  .filter((_, itemIndex) => itemIndex !== index)
                  .map((item) => item.equipmentId),
              );
              const itemErrors = errors.items?.[index];

              return (
                <Stack
                  key={field.id}
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: "flex-start" }}
                >
                  <Controller
                    name={`items.${index}.equipmentId`}
                    control={control}
                    render={({ field: equipmentField }) => (
                      <TextField
                        {...equipmentField}
                        select
                        required
                        fullWidth
                        label={`Equipment ${index + 1}`}
                        disabled={isSubmitting || !locationId}
                        error={Boolean(itemErrors?.equipmentId)}
                        helperText={
                          itemErrors?.equipmentId?.message ??
                          (locationId ? undefined : "Select a location first.")
                        }
                      >
                        {equipmentOptions.map((equipment) => (
                          <MenuItem
                            key={equipment.id}
                            value={equipment.id}
                            disabled={
                              selectedElsewhere.has(equipment.id) ||
                              availableQuantities?.[equipment.id] === 0
                            }
                          >
                            {equipment.name} (
                            {availableQuantities?.[equipment.id] !== undefined
                              ? `${availableQuantities[equipment.id]} of ${equipment.totalQuantity} available`
                              : `stock: ${equipment.totalQuantity}`}
                            )
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                  <TextField
                    {...register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    type="number"
                    required
                    label="Quantity"
                    disabled={isSubmitting}
                    error={Boolean(itemErrors?.quantity)}
                    helperText={itemErrors?.quantity?.message}
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                    sx={{ width: { xs: 110, sm: 140 }, flexShrink: 0 }}
                  />
                  <IconButton
                    aria-label={`Remove equipment ${index + 1}`}
                    onClick={() => remove(index)}
                    disabled={isSubmitting || fields.length === 1}
                    sx={{ mt: 1 }}
                  >
                    <DeleteOutlinedIcon />
                  </IconButton>
                </Stack>
              );
            })}
          </Stack>
          {(errors.items?.root?.message ?? errors.items?.message) ? (
            <Typography
              color="error"
              variant="body2"
              sx={{ mt: 1 }}
              role="alert"
            >
              {errors.items?.root?.message ?? errors.items?.message}
            </Typography>
          ) : null}
          <Button
            startIcon={<AddIcon />}
            onClick={() => append(EMPTY_ITEM)}
            disabled={
              isSubmitting ||
              !locationId ||
              fields.length >= equipmentOptions.length
            }
            sx={{ mt: 1.5 }}
          >
            Add equipment
          </Button>
        </Box>

        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "flex-end" }}
        >
          <Button href="/" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create reservation"}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
