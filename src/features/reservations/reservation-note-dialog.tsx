"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { sendJson } from "@/lib/api-client";
import { formatUtcShortDateTime } from "@/lib/date-time";
import { reservationNoteSchema, type ReservationNoteInput } from "@/schemas/reservation-note";
import type { ReservationListItem } from "@/types/reservation";

export function ReservationNoteDialog({
  reservation,
  onClose,
}: {
  reservation: ReservationListItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReservationNoteInput>({
    resolver: zodResolver(reservationNoteSchema),
    defaultValues: { note: reservation.note ?? "" },
  });

  async function onSubmit(input: ReservationNoteInput) {
    setServerError(null);

    const result = await sendJson(
      `/api/reservations/${reservation.id}/note`,
      "PUT",
      input,
      "The note could not be saved.",
    );

    if (!result.ok) {
      setServerError(result.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Dialog open onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>Edit internal note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography color="text.secondary">
              {reservation.locationName} · {formatUtcShortDateTime(reservation.startAt)}
            </Typography>
            {serverError ? <Alert severity="error">{serverError}</Alert> : null}
            <TextField
              {...register("note")}
              label="Internal note"
              multiline
              minRows={3}
              autoFocus
              required
              fullWidth
              disabled={isSubmitting}
              error={Boolean(errors.note)}
              helperText={errors.note?.message ?? "Maximum 240 characters"}
              slotProps={{ htmlInput: { maxLength: 240 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save note"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
