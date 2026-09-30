import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

// Current seat hold (seats locked while the user checks out), platform settings,
// and one shared clock so every countdown ticks together.
const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const { user } = useAuth();
  const [hold, setHold] = useState(null); // { holdId, eventId, seatIds, createdAt, expiresAt, event, seats }
  const [now, setNow] = useState(Date.now());
  const [settings, setSettings] = useState({ bookingFee: 40, maxPerUser: 6, holdMinutes: 5 });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refreshSettings = useCallback(() => api.getSettings().then(setSettings).catch(() => {}), []);
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // A hold belongs to the signed-in user; drop it when they sign out.
  useEffect(() => {
    if (!user) setHold(null);
  }, [user]);

  const remainingMs = hold ? new Date(hold.expiresAt).getTime() - now : 0;
  const totalMs = hold ? new Date(hold.expiresAt) - new Date(hold.createdAt) : 1;
  const expired = Boolean(hold) && remainingMs <= 0;

  const startHold = useCallback(async (event, seats) => {
    const res = await api.holdSeats(event.id, seats.map((s) => s.id));
    const next = { ...res, event, seats };
    setHold(next);
    return next;
  }, []);

  const cancelHold = useCallback(async () => {
    if (hold) await api.releaseHold(hold.holdId);
    setHold(null);
  }, [hold]);

  const clearHold = useCallback(() => setHold(null), []);
  const fee = useCallback((count) => count * settings.bookingFee, [settings]);

  return (
    <BookingContext.Provider
      value={{ hold, now, remainingMs, totalMs, expired, startHold, cancelHold, clearHold, settings, refreshSettings, fee }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export const useBooking = () => useContext(BookingContext);
