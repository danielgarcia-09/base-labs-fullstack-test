import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { ReservationForm } from "@/features/reservations/reservation-form";
import { getReservationForEdit } from "@/server/reservations/get-reservation";
import { listLocationOptions } from "@/server/reservations/list-locations";

export const dynamic = "force-dynamic";

export default async function EditReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reservation, locations] = await Promise.all([getReservationForEdit(id), listLocationOptions()]);

  if (!reservation) {
    notFound();
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          Edit Reservation
        </Typography>
        <Typography color="text.secondary">
          Change the period, equipment or status. Confirmed reservations are checked against
          availability when you save, and this reservation never counts against itself.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <ReservationForm
            locations={locations}
            minDateTime={new Date().toISOString().slice(0, 16)}
            reservation={reservation}
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
