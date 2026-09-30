// API layer. Every screen talks to the backend only through `api`.
//
// By default it runs against an in-browser mock (src/api/mockDb.js) that follows
// the same rules the Spring Boot backend should enforce. Set VITE_USE_MOCK=false
// in .env to call the real API (vite.config.js proxies /api to localhost:8080).
// The full endpoint list is in README.md.

import { getDb, saveDb, resetDb, uid } from './mockDb';
import { capacityOf, minPrice, seatPrice, tierForRow, validateLayout, ROW_LETTERS, CATEGORY_HUE } from '../data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Session token (shared by mock and real)
// ---------------------------------------------------------------------------
let token = null;
export const setToken = (t) => (token = t);

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => structuredClone(x);
const now = () => Date.now();

function currentUser() {
  const db = getDb();
  const id = token?.startsWith('mock.') ? token.slice(5) : null;
  const u = id && db.users.find((x) => x.id === id);
  return u && u.status === 'ACTIVE' ? u : null;
}
function requireRole(...roles) {
  const u = currentUser();
  if (!u) throw new ApiError('Sign in to continue.', 401);
  if (!roles.includes(u.role)) throw new ApiError("You don't have access to this.", 403);
  return u;
}
const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, org: u.org || null };

function log(actor, action, target) {
  const db = getDb();
  db.audit.unshift({ id: uid('a'), at: new Date().toISOString(), actor: actor.name, action, target });
}

function dropExpiredHolds() {
  const db = getDb();
  db.holds = db.holds.filter((h) => new Date(h.expiresAt).getTime() > now());
}

function eventStats(e) {
  const db = getDb();
  dropExpiredHolds();
  const bks = db.bookings.filter((b) => b.eventId === e.id);
  const confirmed = bks.filter((b) => b.status === 'CONFIRMED');
  const sold = confirmed.reduce((s, b) => s + b.seats.length, 0);
  const held = db.holds.filter((h) => h.eventId === e.id).reduce((s, h) => s + h.seatIds.length, 0);
  return {
    capacity: capacityOf(e.layout),
    sold,
    held,
    revenue: confirmed.reduce((s, b) => s + b.amount, 0),
    bookings: confirmed.length,
    checkedIn: confirmed.filter((b) => b.checkedInAt).reduce((s, b) => s + b.seats.length, 0),
  };
}

// Stored status is DRAFT | PENDING | REJECTED | PUBLISHED | CANCELLED.
// For published events we derive what the public sees.
function stateOf(e, stats = eventStats(e)) {
  if (e.status !== 'PUBLISHED') return e.status;
  if (new Date(e.startsAt).getTime() < now()) return 'ENDED';
  if (stats.sold >= stats.capacity) return 'SOLD_OUT';
  if (new Date(e.saleOpensAt).getTime() > now()) return 'UPCOMING';
  return 'ON_SALE';
}

function decorate(e) {
  const db = getDb();
  const stats = eventStats(e);
  const org = db.users.find((u) => u.id === e.organizerId);
  return {
    ...clone(e),
    state: stateOf(e, stats),
    priceFrom: minPrice(e.layout),
    stats,
    organizer: org ? { id: org.id, name: org.name, orgName: org.org?.name } : null,
  };
}

function findEvent(id) {
  const e = getDb().events.find((x) => x.id === id);
  if (!e) throw new ApiError('Event not found.', 404);
  return e;
}
function ownEvent(id, user) {
  const e = findEvent(id);
  if (user.role === 'ORGANIZER' && e.organizerId !== user.id) throw new ApiError("You can only manage your own events.", 403);
  return e;
}

function buildSeatRows(e, { includeHeld = false } = {}) {
  const db = getDb();
  dropExpiredHolds();
  const sold = new Set(db.bookings.filter((b) => b.eventId === e.id && b.status === 'CONFIRMED').flatMap((b) => b.seats));
  const held = new Set(db.holds.filter((h) => h.eventId === e.id).flatMap((h) => h.seatIds));
  const { rows, seatsPerRow, aisleAfter } = e.layout;
  return Array.from({ length: rows }, (_, r) => {
    const tier = tierForRow(e.layout, r);
    const row = ROW_LETTERS[r];
    return {
      row,
      tier: tier.name,
      tierIndex: tier.index,
      price: Number(tier.price),
      aisleAfter: Number(aisleAfter),
      seats: Array.from({ length: seatsPerRow }, (_, i) => {
        const id = `${row}${i + 1}`;
        const status = sold.has(id) ? 'sold' : held.has(id) ? (includeHeld ? 'held' : 'sold') : 'available';
        return { id, number: i + 1, price: Number(tier.price), tier: tier.name, status };
      }),
    };
  });
}

const mock = {
  // ----- auth -----
  async login(email, password) {
    await wait(400);
    const u = getDb().users.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || !u.password || u.password !== password) throw new ApiError('Email or password is incorrect.', 401);
    if (u.status === 'SUSPENDED') throw new ApiError('This account is suspended. Contact support@flashtix.in.', 403);
    return { token: `mock.${u.id}`, user: publicUser(u) };
  },
  async signup({ name, email, password }) {
    await wait(400);
    const db = getDb();
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw new ApiError('An account with this email already exists. Sign in instead.', 409);
    const u = { id: uid('u'), name: name.trim(), email: email.trim(), password, role: 'USER', status: 'ACTIVE' };
    db.users.push(u);
    saveDb();
    return { token: `mock.${u.id}`, user: publicUser(u) };
  },
  async getInvite(inviteToken) {
    await wait(200);
    const u = getDb().users.find((x) => x.inviteToken === inviteToken && x.status === 'INVITED');
    if (!u) throw new ApiError('This invite link is invalid or has already been used.', 404);
    return publicUser(u);
  },
  async acceptInvite(inviteToken, password) {
    await wait(400);
    const db = getDb();
    const u = db.users.find((x) => x.inviteToken === inviteToken && x.status === 'INVITED');
    if (!u) throw new ApiError('This invite link is invalid or has already been used.', 404);
    u.password = password;
    u.status = 'ACTIVE';
    delete u.inviteToken;
    log(u, 'Accepted organizer invite', u.org?.name || u.email);
    saveDb();
    return { token: `mock.${u.id}`, user: publicUser(u) };
  },
  async me() {
    return publicUser(currentUser());
  },

  // ----- public catalogue -----
  async listEvents({ q = '', city = 'All cities', category = 'All', date = '' } = {}) {
    await wait();
    const term = q.trim().toLowerCase();
    return getDb()
      .events.filter((e) => e.status === 'PUBLISHED')
      .map(decorate)
      .filter((e) => e.state !== 'ENDED')
      .filter(
        (e) =>
          (category === 'All' || e.category === category) &&
          (city === 'All cities' || e.city === city) &&
          (!date || localDay(e.startsAt) === date) &&
          (!term || `${e.title} ${e.venue} ${e.city}`.toLowerCase().includes(term))
      )
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  },
  async getEvent(id) {
    await wait(150);
    const e = findEvent(id);
    const u = currentUser();
    const canPreview = u && (u.role === 'ADMIN' || e.organizerId === u.id);
    if (e.status !== 'PUBLISHED' && !canPreview) throw new ApiError('Event not found.', 404);
    return decorate(e);
  },
  async getSeats(id) {
    await wait(150);
    const e = findEvent(id);
    const u = currentUser();
    const staff = u && (u.role === 'ADMIN' || e.organizerId === u.id);
    return buildSeatRows(e, { includeHeld: staff });
  },
  async getSettings() {
    return clone(getDb().settings);
  },

  // ----- user -----
  async holdSeats(eventId, seatIds) {
    await wait(400);
    const user = requireRole('USER');
    const db = getDb();
    const e = findEvent(eventId);
    const state = stateOf(e);
    if (state !== 'ON_SALE') throw new ApiError('Tickets for this event are not on sale right now.', 409);
    dropExpiredHolds();
    // One active hold per user: release the old one first.
    db.holds = db.holds.filter((h) => h.userId !== user.id);

    const owned = db.bookings
      .filter((b) => b.eventId === eventId && b.userId === user.id && b.status === 'CONFIRMED')
      .reduce((s, b) => s + b.seats.length, 0);
    if (owned + seatIds.length > e.maxPerUser) {
      const left = Math.max(0, e.maxPerUser - owned);
      throw new ApiError(
        left
          ? `You can book ${left} more seat${left > 1 ? 's' : ''} for this event (limit ${e.maxPerUser} per person).`
          : `You've reached the limit of ${e.maxPerUser} seats for this event.`,
        422
      );
    }
    const rows = buildSeatRows(e);
    const flat = rows.flatMap((r) => r.seats);
    const taken = flat.filter((s) => seatIds.includes(s.id) && s.status !== 'available');
    if (taken.length)
      throw new ApiError(`${taken.map((s) => s.id).join(', ')} ${taken.length > 1 ? 'were' : 'was'} just taken. Pick another seat.`, 409);

    const minutes = db.settings.holdMinutes;
    const hold = {
      holdId: uid('hold'),
      eventId,
      userId: user.id,
      seatIds,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(now() + minutes * 60_000).toISOString(),
    };
    db.holds.push(hold);
    saveDb();
    return clone(hold);
  },
  async releaseHold(holdId) {
    const db = getDb();
    db.holds = db.holds.filter((h) => h.holdId !== holdId);
    saveDb();
  },
  async createBooking({ holdId, name, email, phone }) {
    await wait(600);
    const user = requireRole('USER');
    const db = getDb();
    // Idempotency: same hold id → same booking.
    const existing = db.bookings.find((b) => b.holdId === holdId);
    if (existing) return { ...clone(existing), event: decorate(findEvent(existing.eventId)) };

    const hold = db.holds.find((h) => h.holdId === holdId && h.userId === user.id);
    if (!hold || new Date(hold.expiresAt).getTime() < now())
      throw new ApiError('Your hold has expired. Choose your seats again.', 410);
    const e = findEvent(hold.eventId);
    const amount = hold.seatIds.reduce((s, id) => s + seatPrice(e.layout, id), 0);
    const fee = db.settings.bookingFee * hold.seatIds.length;
    const booking = {
      id: `FTX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      holdId,
      eventId: e.id,
      userId: user.id,
      name,
      email,
      phone,
      seats: hold.seatIds,
      amount,
      fee,
      total: amount + fee,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      checkedInAt: null,
    };
    db.bookings.unshift(booking);
    db.holds = db.holds.filter((h) => h.holdId !== holdId);
    saveDb();
    return { ...clone(booking), event: decorate(e) };
  },
  async myBookings() {
    await wait();
    const user = requireRole('USER');
    return getDb()
      .bookings.filter((b) => b.userId === user.id)
      .map((b) => ({ ...clone(b), event: decorate(findEvent(b.eventId)) }));
  },
  async cancelBooking(id) {
    await wait(400);
    const user = requireRole('USER');
    const db = getDb();
    const b = db.bookings.find((x) => x.id === id && x.userId === user.id);
    if (!b) throw new ApiError('Booking not found.', 404);
    const e = findEvent(b.eventId);
    if (new Date(e.startsAt).getTime() - now() < 24 * 36e5)
      throw new ApiError('Bookings can only be cancelled up to 24 hours before the show.', 422);
    b.status = 'REFUNDED';
    b.refundedAt = new Date().toISOString();
    log(user, 'Cancelled booking', `${b.id} · ${e.title}`);
    saveDb();
    return clone(b);
  },
  async myReminders() {
    const u = currentUser();
    if (!u) return [];
    return getDb().reminders.filter((r) => r.userId === u.id).map((r) => r.eventId);
  },
  async toggleReminder(eventId) {
    await wait(200);
    const user = requireRole('USER');
    const db = getDb();
    const i = db.reminders.findIndex((r) => r.userId === user.id && r.eventId === eventId);
    if (i >= 0) db.reminders.splice(i, 1);
    else db.reminders.push({ userId: user.id, eventId });
    saveDb();
    return i < 0;
  },

  // ----- organizer -----
  async orgEvents() {
    await wait();
    const user = requireRole('ORGANIZER');
    return getDb()
      .events.filter((e) => e.organizerId === user.id)
      .map(decorate)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  async orgEvent(id) {
    await wait(150);
    const user = requireRole('ORGANIZER', 'ADMIN');
    return decorate(ownEvent(id, user));
  },
  async saveEvent(data) {
    await wait(400);
    const user = requireRole('ORGANIZER');
    const db = getDb();
    const settings = db.settings;
    if (data.id) {
      const e = ownEvent(data.id, user);
      if (['CANCELLED'].includes(e.status) || stateOf(e) === 'ENDED') throw new ApiError('This event can no longer be edited.', 409);
      if (e.status === 'PUBLISHED' || e.status === 'PENDING') {
        // Locked once submitted/published: only text details can change.
        e.description = data.description;
        e.venue = data.venue;
        log(user, 'Edited event details', e.title);
        saveDb();
        return decorate(e);
      }
      Object.assign(e, sanitize(data, settings));
      e.status = 'DRAFT';
      e.rejectionReason = null;
      saveDb();
      return decorate(e);
    }
    const e = { id: uid('evt'), organizerId: user.id, status: 'DRAFT', createdAt: new Date().toISOString(), rejectionReason: null, ...sanitize(data, settings) };
    db.events.push(e);
    log(user, 'Created draft event', e.title);
    saveDb();
    return decorate(e);
  },
  async submitEvent(id) {
    await wait(300);
    const user = requireRole('ORGANIZER');
    const e = ownEvent(id, user);
    if (!['DRAFT', 'REJECTED'].includes(e.status)) throw new ApiError('Only drafts can be submitted.', 409);
    const errs = validateEvent(e);
    if (errs.length) throw new ApiError(errs[0], 422);
    e.status = 'PENDING';
    e.submittedAt = new Date().toISOString();
    log(user, 'Submitted event for approval', e.title);
    saveDb();
    return decorate(e);
  },
  async deleteDraft(id) {
    await wait(200);
    const user = requireRole('ORGANIZER');
    const e = ownEvent(id, user);
    if (!['DRAFT', 'REJECTED'].includes(e.status)) throw new ApiError('Only drafts can be deleted.', 409);
    const db = getDb();
    db.events = db.events.filter((x) => x.id !== id);
    log(user, 'Deleted draft', e.title);
    saveDb();
  },
  async cancelEvent(id, reason) {
    await wait(500);
    const user = requireRole('ORGANIZER', 'ADMIN');
    const e = ownEvent(id, user);
    if (e.status !== 'PUBLISHED') throw new ApiError('Only published events can be cancelled.', 409);
    const db = getDb();
    e.status = 'CANCELLED';
    e.cancelReason = reason || '';
    let refunded = 0;
    db.bookings.forEach((b) => {
      if (b.eventId === id && b.status === 'CONFIRMED') {
        b.status = 'REFUNDED';
        b.refundedAt = new Date().toISOString();
        refunded++;
      }
    });
    db.holds = db.holds.filter((h) => h.eventId !== id);
    log(user, `Cancelled event, refunded ${refunded} booking${refunded === 1 ? '' : 's'}`, e.title);
    saveDb();
    return { event: decorate(e), refunded };
  },
  async attendees(eventId) {
    await wait(200);
    const user = requireRole('ORGANIZER', 'ADMIN');
    ownEvent(eventId, user);
    return clone(getDb().bookings.filter((b) => b.eventId === eventId));
  },
  async checkIn(eventId, code) {
    await wait(300);
    const user = requireRole('ORGANIZER');
    const e = ownEvent(eventId, user);
    const db = getDb();
    const b = db.bookings.find((x) => x.id.toUpperCase() === String(code).trim().toUpperCase());
    if (!b || b.eventId !== e.id) return { result: 'NOT_FOUND' };
    if (b.status !== 'CONFIRMED') return { result: 'CANCELLED', booking: clone(b) };
    if (b.checkedInAt) return { result: 'ALREADY', booking: clone(b) };
    b.checkedInAt = new Date().toISOString();
    saveDb();
    return { result: 'OK', booking: clone(b) };
  },
  async orgStats() {
    await wait();
    const user = requireRole('ORGANIZER');
    const evs = getDb().events.filter((e) => e.organizerId === user.id).map(decorate);
    return {
      events: evs.length,
      live: evs.filter((e) => ['ON_SALE', 'UPCOMING', 'SOLD_OUT'].includes(e.state)).length,
      pending: evs.filter((e) => e.status === 'PENDING').length,
      ticketsSold: evs.reduce((s, e) => s + e.stats.sold, 0),
      revenue: evs.reduce((s, e) => s + e.stats.revenue, 0),
    };
  },

  // ----- admin -----
  async adminStats() {
    await wait();
    requireRole('ADMIN');
    const db = getDb();
    const confirmed = db.bookings.filter((b) => b.status === 'CONFIRMED');
    const evs = db.events.map(decorate);
    return {
      revenue: confirmed.reduce((s, b) => s + b.amount, 0),
      fees: confirmed.reduce((s, b) => s + b.fee, 0),
      ticketsSold: confirmed.reduce((s, b) => s + b.seats.length, 0),
      liveEvents: evs.filter((e) => ['ON_SALE', 'UPCOMING', 'SOLD_OUT'].includes(e.state)).length,
      pending: evs.filter((e) => e.status === 'PENDING').length,
      organizers: db.users.filter((u) => u.role === 'ORGANIZER').length,
      users: db.users.filter((u) => u.role === 'USER').length,
    };
  },
  async adminEvents() {
    await wait();
    requireRole('ADMIN');
    return getDb()
      .events.filter((e) => e.status !== 'DRAFT')
      .map(decorate)
      .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
  },
  async approveEvent(id) {
    await wait(300);
    const admin = requireRole('ADMIN');
    const e = findEvent(id);
    if (e.status !== 'PENDING') throw new ApiError('Only events waiting for approval can be approved.', 409);
    e.status = 'PUBLISHED';
    e.approvedAt = new Date().toISOString();
    log(admin, 'Approved event', e.title);
    saveDb();
    return decorate(e);
  },
  async rejectEvent(id, reason) {
    await wait(300);
    const admin = requireRole('ADMIN');
    const e = findEvent(id);
    if (e.status !== 'PENDING') throw new ApiError('Only events waiting for approval can be rejected.', 409);
    if (!reason?.trim()) throw new ApiError('Add a reason so the organizer knows what to fix.', 422);
    e.status = 'REJECTED';
    e.rejectionReason = reason.trim();
    log(admin, 'Rejected event', e.title);
    saveDb();
    return decorate(e);
  },
  async listUsers(role) {
    await wait();
    requireRole('ADMIN');
    const db = getDb();
    return db.users
      .filter((u) => u.role === role)
      .map((u) => ({
        ...publicUser(u),
        inviteToken: u.inviteToken || null,
        events: db.events.filter((e) => e.organizerId === u.id).length,
        bookings: db.bookings.filter((b) => b.userId === u.id).length,
      }));
  },
  async inviteOrganizer({ name, email, orgName, phone }) {
    await wait(400);
    const admin = requireRole('ADMIN');
    const db = getDb();
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw new ApiError('Someone already uses this email.', 409);
    const u = {
      id: uid('u'),
      name: name.trim(),
      email: email.trim(),
      password: null,
      role: 'ORGANIZER',
      status: 'INVITED',
      inviteToken: uid('inv'),
      org: { name: orgName.trim(), phone: phone.trim() },
    };
    db.users.push(u);
    log(admin, 'Added organizer', `${u.name} (${u.org.name})`);
    saveDb();
    return { ...publicUser(u), inviteToken: u.inviteToken };
  },
  async setUserStatus(id, status) {
    await wait(250);
    const admin = requireRole('ADMIN');
    const u = getDb().users.find((x) => x.id === id);
    if (!u || u.role === 'ADMIN') throw new ApiError('User not found.', 404);
    u.status = status;
    log(admin, status === 'SUSPENDED' ? 'Suspended account' : 'Reactivated account', `${u.name} (${u.role.toLowerCase()})`);
    saveDb();
    return publicUser(u);
  },
  async adminBookings(q = '') {
    await wait();
    requireRole('ADMIN');
    const db = getDb();
    const term = q.trim().toLowerCase();
    return db.bookings
      .filter((b) => !term || `${b.id} ${b.name} ${b.email}`.toLowerCase().includes(term))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100)
      .map((b) => ({ ...clone(b), eventTitle: db.events.find((e) => e.id === b.eventId)?.title || '—' }));
  },
  async refundBooking(id) {
    await wait(300);
    const admin = requireRole('ADMIN');
    const b = getDb().bookings.find((x) => x.id === id);
    if (!b) throw new ApiError('Booking not found.', 404);
    if (b.status !== 'CONFIRMED') throw new ApiError('This booking was already refunded.', 409);
    b.status = 'REFUNDED';
    b.refundedAt = new Date().toISOString();
    log(admin, 'Refunded booking', `${b.id} · ${b.name}`);
    saveDb();
    return clone(b);
  },
  async updateSettings(next) {
    await wait(300);
    const admin = requireRole('ADMIN');
    const db = getDb();
    const s = { bookingFee: Number(next.bookingFee), maxPerUser: Number(next.maxPerUser), holdMinutes: Number(next.holdMinutes) };
    if (!(s.bookingFee >= 0)) throw new ApiError('Booking fee cannot be negative.', 422);
    if (!(s.maxPerUser >= 1 && s.maxPerUser <= 20)) throw new ApiError('Ticket limit must be between 1 and 20.', 422);
    if (!(s.holdMinutes >= 1 && s.holdMinutes <= 15)) throw new ApiError('Hold time must be between 1 and 15 minutes.', 422);
    db.settings = s;
    log(admin, 'Updated platform settings', `Fee ₹${s.bookingFee}, limit ${s.maxPerUser}, hold ${s.holdMinutes} min`);
    saveDb();
    return clone(s);
  },
  async auditLog() {
    await wait();
    requireRole('ADMIN');
    return clone(getDb().audit.slice(0, 200));
  },
  async resetDemo() {
    resetDb();
  },
};

function sanitize(d, settings) {
  const layout = {
    rows: Number(d.layout.rows),
    seatsPerRow: Number(d.layout.seatsPerRow),
    aisleAfter: Number(d.layout.aisleAfter),
    tiers: d.layout.tiers.map((t) => ({ name: String(t.name).trim(), rows: Number(t.rows), price: Number(t.price) })),
  };
  return {
    title: String(d.title).trim(),
    category: d.category,
    city: d.city,
    venue: String(d.venue).trim(),
    description: String(d.description || '').trim(),
    startsAt: new Date(d.startsAt).toISOString(),
    saleOpensAt: new Date(d.saleOpensAt).toISOString(),
    maxPerUser: Math.min(Number(d.maxPerUser) || settings.maxPerUser, settings.maxPerUser),
    hue: CATEGORY_HUE[d.category] ?? 250,
    layout,
  };
}

export function validateEvent(e) {
  const errs = [];
  if (!e.title?.trim()) errs.push('Add an event name.');
  if (!e.venue?.trim()) errs.push('Add a venue.');
  if (!e.startsAt || isNaN(new Date(e.startsAt))) errs.push('Choose when the show starts.');
  if (!e.saleOpensAt || isNaN(new Date(e.saleOpensAt))) errs.push('Choose when ticket sales open.');
  if (e.startsAt && e.saleOpensAt && new Date(e.saleOpensAt) >= new Date(e.startsAt)) errs.push('Ticket sales must open before the show starts.');
  if (e.startsAt && new Date(e.startsAt) < new Date()) errs.push('The show date is in the past.');
  errs.push(...validateLayout(e.layout));
  return errs;
}

// ---------------------------------------------------------------------------
// Real implementation (Spring Boot)
// ---------------------------------------------------------------------------
async function http(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.message || `Request failed (${res.status})`, res.status);
  }
  return res.status === 204 ? null : res.json();
}
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v && v !== 'All' && v !== 'All cities')).toString();

const real = {
  login: (email, password) => http('/auth/login', { method: 'POST', body: { email, password } }),
  signup: (b) => http('/auth/signup', { method: 'POST', body: b }),
  getInvite: (t) => http(`/auth/invites/${t}`),
  acceptInvite: (t, password) => http(`/auth/invites/${t}/accept`, { method: 'POST', body: { password } }),
  me: () => http('/auth/me'),

  listEvents: (p = {}) => http(`/events?${qs(p)}`),
  getEvent: (id) => http(`/events/${id}`),
  getSeats: (id) => http(`/events/${id}/seats`),
  getSettings: () => http('/settings/public'),

  holdSeats: (eventId, seatIds) => http('/holds', { method: 'POST', body: { eventId, seatIds } }),
  releaseHold: (id) => http(`/holds/${id}`, { method: 'DELETE' }),
  createBooking: (b) => http('/bookings', { method: 'POST', body: b, headers: { 'Idempotency-Key': b.holdId } }),
  myBookings: () => http('/bookings/me'),
  cancelBooking: (id) => http(`/bookings/${id}/cancel`, { method: 'POST' }),
  myReminders: () => http('/reminders/me'),
  toggleReminder: (eventId) => http(`/reminders/${eventId}`, { method: 'POST' }),

  orgEvents: () => http('/organizer/events'),
  orgEvent: (id) => http(`/organizer/events/${id}`),
  saveEvent: (e) => (e.id ? http(`/organizer/events/${e.id}`, { method: 'PUT', body: e }) : http('/organizer/events', { method: 'POST', body: e })),
  submitEvent: (id) => http(`/organizer/events/${id}/submit`, { method: 'POST' }),
  deleteDraft: (id) => http(`/organizer/events/${id}`, { method: 'DELETE' }),
  cancelEvent: (id, reason) => http(`/organizer/events/${id}/cancel`, { method: 'POST', body: { reason } }),
  attendees: (id) => http(`/organizer/events/${id}/attendees`),
  checkIn: (eventId, code) => http(`/organizer/events/${eventId}/check-in`, { method: 'POST', body: { code } }),
  orgStats: () => http('/organizer/stats'),

  adminStats: () => http('/admin/stats'),
  adminEvents: () => http('/admin/events'),
  approveEvent: (id) => http(`/admin/events/${id}/approve`, { method: 'POST' }),
  rejectEvent: (id, reason) => http(`/admin/events/${id}/reject`, { method: 'POST', body: { reason } }),
  listUsers: (role) => http(`/admin/users?role=${role}`),
  inviteOrganizer: (b) => http('/admin/organizers', { method: 'POST', body: b }),
  setUserStatus: (id, status) => http(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } }),
  adminBookings: (q) => http(`/admin/bookings?${qs({ q })}`),
  refundBooking: (id) => http(`/admin/bookings/${id}/refund`, { method: 'POST' }),
  updateSettings: (s) => http('/admin/settings', { method: 'PUT', body: s }),
  auditLog: () => http('/admin/audit'),
  resetDemo: async () => {},
};

export const api = USE_MOCK ? mock : real;
export const IS_MOCK = USE_MOCK;
