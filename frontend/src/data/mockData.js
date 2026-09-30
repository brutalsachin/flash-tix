// Static reference data + helpers shared by the mock backend and the UI.

export const CATEGORIES = ['All', 'Concerts', 'Comedy', 'Sports', 'Theatre'];
export const EVENT_CATEGORIES = CATEGORIES.slice(1);
export const CITIES = ['All cities', 'Kanpur', 'Lucknow', 'Delhi', 'Mumbai', 'Bengaluru'];
export const EVENT_CITIES = CITIES.slice(1);
export const CATEGORY_HUE = { Concerts: 250, Comedy: 32, Sports: 150, Theatre: 350 };

export const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const DEFAULT_LAYOUT = {
  rows: 10,
  seatsPerRow: 14,
  aisleAfter: 7,
  tiers: [
    { name: 'Premium', rows: 3, price: 2999 },
    { name: 'Standard', rows: 4, price: 1999 },
    { name: 'Economy', rows: 3, price: 999 },
  ],
};

// Which tier a row index (0-based) belongs to.
export function tierForRow(layout, rowIndex) {
  let acc = 0;
  for (let i = 0; i < layout.tiers.length; i++) {
    acc += Number(layout.tiers[i].rows);
    if (rowIndex < acc) return { ...layout.tiers[i], index: i };
  }
  const last = layout.tiers[layout.tiers.length - 1];
  return { ...last, index: layout.tiers.length - 1 };
}

export const capacityOf = (layout) => layout.rows * layout.seatsPerRow;
export const minPrice = (layout) => Math.min(...layout.tiers.map((t) => Number(t.price)));

export function seatPrice(layout, seatId) {
  const rowIndex = ROW_LETTERS.indexOf(seatId.replace(/\d+/g, ''));
  return Number(tierForRow(layout, rowIndex).price);
}

// Validation shared by the organizer form and the mock backend.
export function validateLayout(layout) {
  const errors = [];
  const rows = Number(layout.rows);
  const per = Number(layout.seatsPerRow);
  if (!(rows >= 1 && rows <= 26)) errors.push('Rows must be between 1 and 26.');
  if (!(per >= 4 && per <= 30)) errors.push('Seats per row must be between 4 and 30.');
  if (Number(layout.aisleAfter) < 0 || Number(layout.aisleAfter) >= per) errors.push('Aisle position must be less than seats per row (0 for no aisle).');
  if (!layout.tiers.length) errors.push('Add at least one price tier.');
  const sum = layout.tiers.reduce((s, t) => s + Number(t.rows || 0), 0);
  if (sum !== rows) errors.push(`Tier rows add up to ${sum}, but the venue has ${rows} rows.`);
  layout.tiers.forEach((t, i) => {
    if (!String(t.name).trim()) errors.push(`Tier ${i + 1} needs a name.`);
    if (!(Number(t.price) > 0)) errors.push(`Tier "${t.name || i + 1}" needs a price above ₹0.`);
  });
  return errors;
}
