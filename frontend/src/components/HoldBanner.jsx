import { Link, useLocation } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import Countdown from './Countdown';

// Sticky reminder that seats are held, shown everywhere except checkout.
export default function HoldBanner() {
  const { hold, remainingMs, expired } = useBooking();
  const { pathname } = useLocation();
  if (!hold || expired || pathname === '/checkout') return null;

  return (
    <div className="hold-banner" role="status">
      <div className="container hold-banner-inner">
        <span>
          {hold.seats.length} seat{hold.seats.length > 1 ? 's' : ''} held for{' '}
          <strong>{hold.event.title}</strong> · <Countdown ms={remainingMs} compact />
        </span>
        <Link to="/checkout" className="btn btn-small">Finish booking</Link>
      </div>
    </div>
  );
}
