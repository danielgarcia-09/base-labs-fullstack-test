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
