import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container section narrow">
      <h1>Page not found</h1>
      <p className="muted">The link may be broken or the page may have moved.</p>
      <Link to="/" className="btn">Go to events</Link>
    </div>
  );
}
