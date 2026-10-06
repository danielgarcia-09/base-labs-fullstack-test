// "YYYY-MM-DDTHH:mm", optional seconds and milliseconds, optional "Z" or "+HH:mm" offset.
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/i;

/**
 * Parses a form `datetime-local` value ("2027-09-20T09:00") or an ISO string.
 * Values without an explicit offset are interpreted as UTC, matching how the
 * app displays every time. Anything that is not ISO 8601 gives an Invalid Date,
 * so parsing never depends on the JavaScript engine's lenient fallbacks.
 */
export function parseUtcDateTime(value: string): Date {
  const trimmed = value.trim();
  const match = ISO_DATE_TIME.exec(trimmed);
  if (!match) {
    return new Date(Number.NaN);
  }
  return new Date(match[1] ? trimmed : `${trimmed}Z`);
}

/** The current time truncated to the minute, the precision of the date-time pickers. */
export function currentUtcMinute(): Date {
  const now = new Date();
  now.setUTCSeconds(0, 0);
  return now;
}

/** A `datetime-local` value ("YYYY-MM-DDTHH:mm") for the given instant, in UTC. */
export function toDateTimeLocalValue(date: Date): string {
  return date.toISOString().slice(0, 16);
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

/** e.g. "Sep 20, 2027, 09:00" (UTC). */
export function formatUtcDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

/** e.g. "Sep 20, 9:00 AM" (UTC). */
export function formatUtcShortDateTime(value: string): string {
  return shortDateTimeFormatter.format(new Date(value));
}
