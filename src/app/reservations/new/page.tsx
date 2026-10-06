import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { ReservationForm } from "@/features/reservations/reservation-form";
import { listLocationOptions } from "@/server/reservations/list-locations";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const locations = await listLocationOptions();

  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          New Reservation
        </Typography>
        <Typography color="text.secondary">
          Reserve equipment at one location for a time period. Confirmed reservations are checked
          against availability when you save.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <ReservationForm locations={locations} minDateTime={new Date().toISOString().slice(0, 16)} />
        </CardContent>
      </Card>
    </Stack>
  );
}
