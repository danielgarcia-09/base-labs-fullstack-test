import { ReservationForm } from "@/features/reservations/reservation-form";
import { ReservationFormPage } from "@/features/reservations/reservation-form-page";
import { currentUtcMinute, toDateTimeLocalValue } from "@/lib/date-time";
import { listLocationOptions } from "@/server/reservations/list-locations";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const locations = await listLocationOptions();

  return (
    <ReservationFormPage
      title="New Reservation"
      description="Reserve equipment at one location for a time period. Confirmed reservations are checked against availability when you save."
    >
      <ReservationForm locations={locations} minDateTime={toDateTimeLocalValue(currentUtcMinute())} />
    </ReservationFormPage>
  );
}
