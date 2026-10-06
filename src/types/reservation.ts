export type ReservationStatusValue = "DRAFT" | "CONFIRMED";

export interface LocationOption {
  id: string;
  name: string;
  equipment: Array<{
    id: string;
    name: string;
    totalQuantity: number;
  }>;
}

/** A reservation as the form edits it; times are UTC "YYYY-MM-DDTHH:mm" strings. */
export interface ReservationEditValues {
  id: string;
  locationId: string;
  startAt: string;
  endAt: string;
  status: ReservationStatusValue;
  items: Array<{ equipmentId: string; quantity: number }>;
}

export interface ReservationListItem {
  id: string;
  locationName: string;
  startAt: string;
  endAt: string;
  status: ReservationStatusValue;
  note: string | null;
  equipment: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}
