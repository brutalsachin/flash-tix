// In-browser stand-in for the Spring Boot + Postgres + Redis backend.
// Saved to localStorage so a demo survives a refresh and you can switch
// between admin / organizer / user logins and see each other's changes.

import { DEFAULT_LAYOUT, CATEGORY_HUE, ROW_LETTERS, tierForRow } from '../data/mockData';

const KEY = 'flashtix-demo-db-v2';

const at = (days, h = 19, m = 30) => {
  const t = new Date();
  t.setDate(t.getDate() + days);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
};
const minutesFromNow = (min) => new Date(Date.now() + min * 60_000).toISOString();

function layoutFor(base) {
  return {
    ...DEFAULT_LAYOUT,
    tiers: [
      { name: 'Premium', rows: 3, price: Math.round(base * 2) },
      { name: 'Standard', rows: 4, price: Math.round(base * 1.4) },
      { name: 'Economy', rows: 3, price: base },
    ],
  };
}

function seed() {
  const users = [
    { id: 'u-admin', name: 'Platform Admin', email: 'admin@flashtix.in', password: 'admin123', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'u-org1', name: 'Aarav Mehta', email: 'organizer@flashtix.in', password: 'org12345', role: 'ORGANIZER', status: 'ACTIVE', org: { name: 'SoundWave Live', phone: '9876500001' } },
    { id: 'u-org2', name: 'Neha Kapoor', email: 'neha@laughfactory.in', password: 'org12345', role: 'ORGANIZER', status: 'ACTIVE', org: { name: 'Laugh Factory India', phone: '9876500002' } },
    { id: 'u-org3', name: 'Kabir Singh', email: 'kabir@stagecraft.in', password: null, role: 'ORGANIZER', status: 'INVITED', inviteToken: 'inv-kabir-demo', org: { name: 'StageCraft Mumbai', phone: '9876500003' } },
    { id: 'u-user1', name: 'Rishabh Tripathi', email: 'user@flashtix.in', password: 'user1234', role: 'USER', status: 'ACTIVE' },
  ];
  const buyers = ['Ananya Rao', 'Vikram Joshi', 'Priya Nair', 'Rohan Gupta', 'Sneha Iyer', 'Arjun Verma', 'Meera Pillai', 'Karan Malhotra'];
  buyers.forEach((name, i) =>
    users.push({ id: `u-b${i}`, name, email: `${name.split(' ')[0].toLowerCase()}@example.com`, password: 'user1234', role: 'USER', status: 'ACTIVE' })
  );

  const ev = (o) => ({
    hue: CATEGORY_HUE[o.category],
    maxPerUser: 6,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
    rejectionReason: null,
    ...o,
  });

  const events = [
    ev({ id: 'evt-101', organizerId: 'u-org1', title: 'Prateek Kuhad — Silhouettes Tour', category: 'Concerts', city: 'Delhi', venue: 'Jawaharlal Nehru Stadium', startsAt: at(12), saleOpensAt: minutesFromNow(134), layout: layoutFor(1499), description: 'An evening of acoustic sets and new songs from the Silhouettes album. Gates open 60 minutes before the show.' }),
    ev({ id: 'evt-102', organizerId: 'u-org2', title: 'Stand-up Night with Zakir Khan', category: 'Comedy', city: 'Lucknow', venue: 'Indira Gandhi Pratishthan', startsAt: at(5, 20, 0), saleOpensAt: at(-3, 12, 0), layout: layoutFor(799), description: 'Ninety minutes of new material. Recommended for ages 16 and up.' }),
    ev({ id: 'evt-103', organizerId: 'u-org1', title: 'IPL Fan Park Screening', category: 'Sports', city: 'Kanpur', venue: 'Green Park Fan Zone', startsAt: at(3, 19, 0), saleOpensAt: at(-5, 10, 0), layout: layoutFor(299), description: 'Watch the match on a 40-foot screen with food stalls and live commentary.' }),
    ev({ id: 'evt-104', organizerId: 'u-org2', title: 'The Mousetrap', category: 'Theatre', city: 'Mumbai', venue: 'NCPA Tata Theatre', startsAt: at(9, 18, 30), saleOpensAt: at(-2, 12, 0), layout: layoutFor(1200), description: "Agatha Christie's classic whodunit, performed by the Mumbai Stage Collective." }),
    ev({ id: 'evt-105', organizerId: 'u-org1', title: 'Lollapalooza India — Day Pass', category: 'Concerts', city: 'Mumbai', venue: 'Mahalaxmi Racecourse', startsAt: at(21, 14, 0), saleOpensAt: at(-1, 12, 0), layout: layoutFor(4999), description: 'Four stages, forty artists, one day. Re-entry is not permitted.' }),
    ev({ id: 'evt-106', organizerId: 'u-org2', title: 'Bengaluru Open Mic', category: 'Comedy', city: 'Bengaluru', venue: 'The Humming Tree', startsAt: at(2, 21, 0), saleOpensAt: at(-6, 12, 0), layout: layoutFor(349), description: 'Twelve new comics, five minutes each. Grab a drink and vote for your favourite.' }),
    ev({ id: 'evt-107', organizerId: 'u-org1', status: 'PENDING', title: 'Arijit Singh — Live in Concert', category: 'Concerts', city: 'Lucknow', venue: 'Ekana Stadium', startsAt: at(30, 19, 0), saleOpensAt: at(10, 12, 0), layout: layoutFor(1999), description: 'Two and a half hours of hits with a 40-piece orchestra.', submittedAt: new Date(Date.now() - 3 * 36e5).toISOString() }),
    ev({ id: 'evt-108', organizerId: 'u-org1', status: 'DRAFT', title: 'Indie Nights Vol. 3', category: 'Concerts', city: 'Kanpur', venue: 'Moti Jheel Amphitheatre', startsAt: at(40, 18, 0), saleOpensAt: at(20, 12, 0), layout: layoutFor(499), description: 'Five indie bands from across Uttar Pradesh.' }),
  ];

  // Seeded bookings so seat maps and dashboards look realistic.
  let seedN = 42;
  const rand = () => ((seedN = (seedN * 9301 + 49297) % 233280) / 233280);
  const bookings = [];
  let bn = 1000;
  events
    .filter((e) => e.status === 'PUBLISHED' && new Date(e.saleOpensAt) < new Date())
    .forEach((e) => {
      const { rows, seatsPerRow } = e.layout;
      for (let r = 0; r < rows; r++) {
        let n = 1;
        while (n <= seatsPerRow) {
          if (rand() < 0.14) {
            const size = 1 + Math.floor(rand() * 4);
            const seats = [];
            for (let k = 0; k < size && n <= seatsPerRow; k++, n++) seats.push(`${ROW_LETTERS[r]}${n}`);
            const buyer = users[5 + Math.floor(rand() * buyers.length)];
            const price = Number(tierForRow(e.layout, r).price);
            const created = new Date(new Date(e.saleOpensAt).getTime() + rand() * 36e5 * 20);
            bookings.push({
              id: `FTX-${(bn++).toString(36).toUpperCase()}${Math.floor(rand() * 90 + 10)}`,
              eventId: e.id,
              userId: buyer.id,
              name: buyer.name,
              email: buyer.email,
              phone: '98' + Math.floor(10000000 + rand() * 89999999),
              seats,
              amount: price * seats.length,
              fee: 40 * seats.length,
              total: (price + 40) * seats.length,
              status: 'CONFIRMED',
              createdAt: created.toISOString(),
              checkedInAt: null,
            });
          } else n++;
        }
      }
    });

  const audit = [
    { id: 'a1', at: new Date(Date.now() - 5 * 864e5).toISOString(), actor: 'Platform Admin', action: 'Added organizer', target: 'Kabir Singh (StageCraft Mumbai)' },
    { id: 'a2', at: new Date(Date.now() - 4 * 864e5).toISOString(), actor: 'Platform Admin', action: 'Approved event', target: 'Lollapalooza India — Day Pass' },
    { id: 'a3', at: new Date(Date.now() - 3 * 36e5).toISOString(), actor: 'Aarav Mehta', action: 'Submitted event for approval', target: 'Arijit Singh — Live in Concert' },
  ];

  return {
    users,
    events,
    bookings,
    holds: [],
    reminders: [],
    audit,
    settings: { bookingFee: 40, maxPerUser: 6, holdMinutes: 5 },
  };
}

let db = null;

export function getDb() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) db = JSON.parse(raw);
  } catch {
    /* storage unavailable: fall back to memory */
  }
  if (!db) {
    db = seed();
    saveDb();
  }
  return db;
}

export function saveDb() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export function resetDb() {
  db = seed();
  saveDb();
  return db;
}

export const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
