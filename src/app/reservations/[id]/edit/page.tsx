import { notFound } from "next/navigation";
import { ReservationForm } from "@/features/reservations/reservation-form";
import { ReservationFormPage } from "@/features/reservations/reservation-form-page";
import { currentUtcMinute, toDateTimeLocalValue } from "@/lib/date-time";
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
    <ReservationFormPage
      title="Edit Reservation"
      description="Change the period, equipment or status. Confirmed reservations are checked against availability when you save, and this reservation never counts against itself."
    >
      <ReservationForm
        locations={locations}
        minDateTime={toDateTimeLocalValue(currentUtcMinute())}
        reservation={reservation}
      />
    </ReservationFormPage>
  );
}
