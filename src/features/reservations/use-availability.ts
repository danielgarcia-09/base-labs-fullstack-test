import useSWR from "swr";
import { useDebounce } from "use-debounce";

const DEBOUNCE_MS = 1000;

async function fetchAvailability(url: string): Promise<Record<string, number>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Availability could not be loaded.");
  }

  const body = (await response.json()) as { availability: Record<string, number> };
  return body.availability;
}

/**
 * Available quantity per equipment ID for the chosen period, or `undefined` until the
 * location and a valid interval are chosen and the user has stopped changing them.
 *
 * The date-time control emits a value as soon as the hour is picked, but the user may
 * still be choosing minutes, so the request waits for the inputs to settle. SWR keys its
 * results by URL, so a stale response can never be shown for a different period.
 */
export function useAvailability(input: {
  locationId: string;
  startAt: string;
  endAt: string;
  /** When editing, the reservation must not count against its own availability. */
  excludeReservationId?: string;
}): Record<string, number> | undefined {
  const { locationId, startAt, endAt, excludeReservationId } = input;

  let url: string | null = null;
  if (locationId && startAt && endAt && endAt > startAt) {
    const params = new URLSearchParams({ locationId, startAt, endAt });
    if (excludeReservationId) params.set("excludeReservationId", excludeReservationId);
    url = `/api/availability?${params}`;
  }

  const [settledUrl] = useDebounce(url, DEBOUNCE_MS);
  const { data } = useSWR(settledUrl, fetchAvailability, { shouldRetryOnError: false });

  // Until the debounce catches up, `data` belongs to the previous period.
  return url !== null && url === settledUrl ? data : undefined;
}
