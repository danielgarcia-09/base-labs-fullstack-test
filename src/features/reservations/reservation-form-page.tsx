import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

/** Shared page chrome for the create and edit reservation pages. */
export function ReservationFormPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Stack spacing={3}>
      <Box>
        <Button href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
          Back to reservations
        </Button>
        <Typography component="h1" variant="h1" gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>

      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </Stack>
  );
}
