# FlashTix Web

React frontend for FlashTix, a flash-sale event-ticketing platform with three roles: **Admin**, **Organizer** and **User**.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build → dist/
npm run build:single   # one self-contained HTML file → dist-single/index.html (for demos)
```

It runs on an in-browser mock backend by default, so no server is needed. Demo data is saved in the browser (localStorage). You can sign in as different roles and see each other's changes. **Admin → Settings → Reset demo data** restores the starting state.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@flashtix.in | admin123 |
| Organizer | organizer@flashtix.in | org12345 |
| Organizer (2nd) | neha@laughfactory.in | org12345 |
| User | user@flashtix.in | user1234 |

Pending organizer invite: open `#/invite/inv-kabir-demo` to set a password for Kabir Singh.

## What each role can do

**User** (`/`)
- Browse events: search, city, type, date strip, flash-sale countdown
- "Remind me" before a sale opens
- Pick seats (up to the event's per-person limit) → seats are held → pay → ticket
- My tickets: boarding-pass tickets with barcode, cancel up to 24 h before the show

**Organizer** (`/organizer`, account created only by the admin)
- Overview: sales, tickets sold, live events, drafts that need attention
- Create event: details, dates, per-person limit, **seat layout builder** (rows, seats per row, aisle, price tiers) with live preview
- Save draft → submit for approval → fix and resubmit if the admin requests changes
- Seats, prices and dates lock once submitted; only venue name and description stay editable
- Live event view: seat map showing sold, on-hold and available seats (refreshes every 5 s), attendee list, CSV export
- Check-in: type or scan a booking ID. Duplicate scans and refunded tickets are flagged
- Cancel an event, which refunds every booking

**Admin** (`/admin`, account seeded by the backend, never signs up)
- Overview: platform sales, tickets sold, live events, approval queue, latest bookings, activity
- Events: approve and publish, or request changes with a reason, and cancel live events
- Organizers: add organizer (sends an invite link), suspend or reactivate
- Users: search, suspend or reactivate
- Bookings: search by ID, name or email, refund
- Settings: booking fee, platform ticket limit, seat hold time
- Activity log of every approval, refund, cancellation and account change

## Event lifecycle

```
DRAFT → PENDING (submitted) → PUBLISHED (approved) → [UPCOMING → ON_SALE → SOLD_OUT] → ENDED
                ↘ REJECTED (changes requested) → back to DRAFT on edit
PUBLISHED → CANCELLED (all bookings refunded)
```
`UPCOMING / ON_SALE / SOLD_OUT / ENDED` are derived from the dates and seats sold. Only `status` is stored.

## Connecting the Spring Boot backend

1. Create `.env` with `VITE_USE_MOCK=false`.
2. Run the backend on port 8080. Vite proxies `/api/*` to it.
3. Log-in returns `{ token, user }`. The frontend sends `Authorization: Bearer <token>` on every request.
4. **Every endpoint must check the role, and organizers must only reach their own events.** The route guards in React only decide what to show. They don't protect anything.

**Seeding the admin:** on startup, a `CommandLineRunner` creates the admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables if none exists. Hash the password with BCrypt, and don't commit the real password.

### Endpoints the frontend calls (see `src/api/client.js`)

```
Auth
POST   /api/auth/login                      {email, password} → {token, user}
POST   /api/auth/signup                     {name, email, password} → {token, user}   (role USER only)
GET    /api/auth/invites/{token}            → invitee
POST   /api/auth/invites/{token}/accept     {password} → {token, user}
GET    /api/auth/me                         → user

Public
GET    /api/events?q=&city=&category=&date=YYYY-MM-DD
GET    /api/events/{id}
GET    /api/events/{id}/seats
GET    /api/settings/public

User (ROLE_USER)
POST   /api/holds                {eventId, seatIds} → {holdId, createdAt, expiresAt}   409 taken, 422 over limit
DELETE /api/holds/{holdId}
POST   /api/bookings             {holdId, name, email, phone}  + Idempotency-Key header   410 expired
GET    /api/bookings/me
POST   /api/bookings/{id}/cancel                                 422 within 24 h
GET    /api/reminders/me
POST   /api/reminders/{eventId}  (toggle)

Organizer (ROLE_ORGANIZER, own events only)
GET    /api/organizer/stats
GET    /api/organizer/events
GET    /api/organizer/events/{id}
POST   /api/organizer/events              (create draft)
PUT    /api/organizer/events/{id}
DELETE /api/organizer/events/{id}         (drafts only)
POST   /api/organizer/events/{id}/submit
POST   /api/organizer/events/{id}/cancel  {reason}
GET    /api/organizer/events/{id}/attendees
POST   /api/organizer/events/{id}/check-in {code} → {result: OK|ALREADY|CANCELLED|NOT_FOUND, booking}

Admin (ROLE_ADMIN)
GET    /api/admin/stats
GET    /api/admin/events
POST   /api/admin/events/{id}/approve
POST   /api/admin/events/{id}/reject      {reason}
GET    /api/admin/users?role=ORGANIZER|USER
POST   /api/admin/organizers              {name, email, orgName, phone} → invite
PATCH  /api/admin/users/{id}/status       {status: ACTIVE|SUSPENDED}
GET    /api/admin/bookings?q=
POST   /api/admin/bookings/{id}/refund
PUT    /api/admin/settings                {bookingFee, maxPerUser, holdMinutes}
GET    /api/admin/audit
```

The data shapes the UI expects are exactly what `src/api/mockDb.js` stores. Use it as the reference for your DTOs.

## Project structure

```
src/
  api/client.js          all API calls: mock rules + real HTTP versions side by side
  api/mockDb.js          seed data and localStorage persistence (demo only)
  context/AuthContext    signed-in user, token, login/signup/invite
  context/BookingContext seat hold, platform settings, shared clock
  components/            Header, DashboardLayout, SeatMap (+ LayoutPreview), RequireRole, ui (badges, stats, confirm)
  pages/                 public + user pages
  pages/auth/            login, sign-up, accept invite
  pages/admin/           overview, events + review, organizers, users, bookings, settings, activity log
  pages/organizer/       overview, events, event form, event detail, check-in
  styles.css             design tokens (light + dark) and all styles
```
