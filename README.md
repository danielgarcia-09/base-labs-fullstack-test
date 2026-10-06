# Equipment Reservation

Take-home solution for the Base Labs Senior Full Stack Developer assessment. Built on the provided starter: Next.js 16 (App Router), React 19, MUI, React Hook Form, Zod 4, Prisma 7 with SQLite.

## What was done

| Item | Status |
|---|---|
| Ticket 1: fix availability | Done |
| Ticket 2: create reservation (UI, API, persistence, availability enforcement) | Done |
| Optional: edit reservation | Done |

## Setup

Requirements: Node 22 (`.nvmrc`) and pnpm 11.

```bash
pnpm install
pnpm db:setup   # generate Prisma client, apply migrations, load the deterministic seed
pnpm dev        # http://localhost:3000
```

`pnpm db:reset` restores the seed state and replaces local reservation data. `pnpm typecheck` and `pnpm lint` check the code. There are no automated tests; verification was manual (see below).

## Features

- **List** (`/`): existing reservations with notes. Each row has an edit icon.
- **Create** (`/reservations/new`): location, start and end time, status (Draft or Confirmed) and one or more equipment rows. The equipment dropdown shows live availability for the chosen period, for example "Generator (2 of 4 available)", and disables options with none left. Conflicts show as a warning and the form keeps its values.
- **Edit** (`/reservations/[id]/edit`): the same form, pre-filled. The reservation never conflicts with itself, and the internal note is left untouched.

### API

| Route | Purpose |
|---|---|
| `POST /api/reservations` | Create. 201, or 400 (validation), 404 (unknown location or equipment), 409 (insufficient availability) |
| `PUT /api/reservations/[id]` | Edit, same error model plus 404 for an unknown reservation |
| `GET /api/availability?locationId&startAt&endAt[&excludeReservationId]` | Availability per equipment for a period |

## Business rules and how they are enforced

- Intervals are half-open, `[start, end)`. Back-to-back bookings do not conflict. The overlap test is `existing.start < requested.end AND existing.end > requested.start`. The starter used inclusive comparisons, which was the Ticket 1 bug.
- Only `CONFIRMED` reservations consume stock. Drafts never block anything and are not checked.
- Availability is per location and per equipment: `totalQuantity` minus the quantity held by overlapping confirmed reservations.
- Availability is re-checked on the server inside the same transaction as the write. The UI check is only a hint.
- A confirmed request is all or nothing: if any item is short, nothing is saved and the 409 lists every shortfall.
- Quantity must be a positive integer, an equipment type can appear once per reservation, and there must be at least one item.
- The stock is not decremented. `totalQuantity` stays fixed and availability is computed for each period.

## Assumptions and decisions

### Time handling: everything is UTC

- Times are stored as UTC instants (`DateTime`).
- A form value without an offset (`datetime-local`, `2027-09-20T09:00`) is interpreted as UTC, and every time on screen is formatted with `timeZone: "UTC"` and labelled as such. No server or browser local time zone is involved, so behaviour is identical on any machine and there are no daylight-saving ambiguities.
- Parsing is strict ISO 8601 (`parseUtcDateTime`). Non-ISO strings are rejected instead of being left to the engine's lenient parsing.
- Create rejects a start before the current minute (UTC). The picker has minute precision, so the comparison is made at that precision.
- Edit allows keeping a start that has already passed, so reservations in progress stay editable. Only a changed start in the past is rejected. A start that matches the stored one at minute precision counts as unchanged, so seconds in stored data are preserved.
- `/api/availability` rejects `endAt <= startAt`.

### Other decisions

- **Shared rules:** `src/server/reservations/reservation-rules.ts` holds the location, equipment and availability checks used by both create and update.
- **One form, two modes:** `ReservationForm` handles create and edit. The edit page is separate, not a dialog, so it has its own URL and a not-found state.
- **Validation in one place:** the Zod schemas in `src/schemas` are used by the form resolver and by the API routes.
- **Domain errors:** `DomainError` carries a status and a code, and the routes turn it into JSON. Anything unexpected is logged and returned as a generic 500.
- **Pickers:** "now" for the picker minimum is computed on the server and passed in, to avoid hydration mismatches. Availability fetches are debounced by one second and stale responses are ignored.

## Trade-offs and known limits

- **Time zone display:** locations are in Central time, but the app shows UTC. That is consistent and unambiguous, and was chosen for the scope. In production, add a `timezone` column to `Location`, store UTC, and enter and display times in the location's zone. That needs care with the skipped and repeated hours at daylight-saving changes.
- **Client clock:** the "start in the past" rule also runs in the browser against the user's clock. The server is authoritative, so a skewed clock only changes which message the user sees.
- **Availability queries:** availability runs one query per item. It could be a single grouped query.
- **Constraints:** there are no database `CHECK` constraints for `quantity > 0` or `end > start`. They are enforced in application code. They would be good defence in depth.
- **No authentication or authorization**, as out of scope.
- **Stale picker minimum:** the picker minimum is fixed when the page loads. A form left open for a long time still gets correct server-side validation.

## Concurrency

Confirming a reservation reads the overlapping confirmed reservations and then writes, inside one Prisma transaction. SQLite serializes writers, so two simultaneous confirmations cannot both pass the check. I tested three concurrent confirmations for two available units: one succeeded and two got 409.

This does not carry over to Postgres, where concurrent read-then-write transactions can both pass the check. Options there:

- lock the equipment rows being reserved (`SELECT ... FOR UPDATE`) in a consistent order;
- use `SERIALIZABLE` isolation and retry on serialization failures;
- take a per-location advisory lock.

## Production notes

- **Indexes:** `Reservation` is indexed on `(locationId, status, startAt, endAt)`, which matches the overlap query. `ReservationItem` is indexed on `equipmentId`. A confirmed-only partial index would be smaller on Postgres.
- **Cache invalidation:** pages are dynamic, and after a successful save the client calls `router.refresh()`. With caching or a CDN in front, tag the list and availability data and revalidate on write.
- **Multi-tenancy:** every query would take a tenant ID, with `tenantId` on each table and in the leading position of the indexes. Enforcing it centrally (a repository layer or Postgres row-level security) avoids missed filters.
- **Observability:** log domain errors (code, location, period) as structured events, count 409s as a product signal, and add request IDs and tracing around the transaction to see lock waits and slow availability queries.
- **Dependencies:** `pnpm audit` reports a critical issue in `next` 16.3.5 (RCE in `next/og`, fixed in 16.3.6). The app does not use `next/og`, but bumping `next` and `eslint-config-next` to 16.3.6 is recommended. The remaining findings are in transitive or dev-only packages (`sharp`, `source-map-js`, `braces`, `deepmerge-ts`, `mysql2`, `esbuild`).

## Verification

`pnpm typecheck` and `pnpm lint` pass.

Manual checks:

- **Create, over HTTP:** adjacent bookings are accepted; a booking over stock gets 409 with the "Only N Generators are available" message; drafts consume nothing; multi-item requests are all or nothing; concurrent confirmations behave as described above; every validation case (bad range, quantity 0 or 1.5, no items, duplicates, past start, unknown or foreign location or equipment, bad status, bad JSON) returns 400 or 404.
- **Create, in the browser:** empty-submit errors, the conflict warning with the form values kept, the success redirect, picker minimum and maximum, and a 375px mobile layout with no horizontal scroll.
- **Edit, service level on a copy of the database:** own-reservation exclusion, a conflict on a quantity bump, draft to confirmed, confirmed to draft freeing stock, 404s, the note preserved, items replaced, and an in-progress reservation.
- **Edit, in the browser:**
  - The edit page opens pre-filled with the reservation's location, period, status and items, and the equipment dropdown excludes the reservation's own stock ("Generator 4 of 4").
  - Extending the Austin morning booking to 13:00, which overlaps the afternoon booking but not itself, saved and redirected to the list. The note and items were preserved.
  - Raising the afternoon booking to 3 Generators when only 2 were free showed the warning "Only 2 Generators are available for the selected period." The form kept its values and nothing was saved.
  - The seed data was restored afterwards.