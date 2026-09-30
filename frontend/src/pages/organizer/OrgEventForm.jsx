import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, validateEvent } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { LayoutPreview } from '../../components/SeatMap';
import { StatusBadge } from '../../components/ui';
import { useBooking } from '../../context/BookingContext';
import { DEFAULT_LAYOUT, EVENT_CATEGORIES, EVENT_CITIES, capacityOf } from '../../data/mockData';
import { formatINR, toLocalInput } from '../../utils';
import { Field } from '../auth/AuthPages';

function blankEvent(maxPerUser) {
  const show = new Date();
  show.setDate(show.getDate() + 30);
  show.setHours(19, 0, 0, 0);
  const sale = new Date();
  sale.setDate(sale.getDate() + 7);
  sale.setHours(12, 0, 0, 0);
  return {
    title: '',
    category: 'Concerts',
    city: 'Kanpur',
    venue: '',
    description: '',
    startsAt: toLocalInput(show.toISOString()),
    saleOpensAt: toLocalInput(sale.toISOString()),
    maxPerUser,
    layout: structuredClone(DEFAULT_LAYOUT),
  };
}

export default function OrgEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useBooking();
  const [form, setForm] = useState(id ? null : blankEvent(settings.maxPerUser));
  const [status, setStatus] = useState('DRAFT');
  const [rejection, setRejection] = useState('');
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.orgEvent(id).then((e) => {
      setStatus(e.status);
      setRejection(e.rejectionReason || '');
      setForm({
        id: e.id,
        title: e.title,
        category: e.category,
        city: e.city,
        venue: e.venue,
        description: e.description,
        startsAt: toLocalInput(e.startsAt),
        saleOpensAt: toLocalInput(e.saleOpensAt),
        maxPerUser: e.maxPerUser,
        layout: structuredClone(e.layout),
      });
    });
  }, [id]);

  if (!form) return <div className="loader" aria-label="Loading" />;

  const locked = ['PENDING', 'PUBLISHED'].includes(status);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLayout = (k) => (e) => setForm({ ...form, layout: { ...form.layout, [k]: e.target.value } });
  const setTier = (i, k) => (e) => {
    const tiers = form.layout.tiers.map((t, j) => (j === i ? { ...t, [k]: e.target.value } : t));
    setForm({ ...form, layout: { ...form.layout, tiers } });
  };
  const addTier = () =>
    setForm({ ...form, layout: { ...form.layout, tiers: [...form.layout.tiers, { name: '', rows: 1, price: 500 }] } });
  const removeTier = (i) =>
    setForm({ ...form, layout: { ...form.layout, tiers: form.layout.tiers.filter((_, j) => j !== i) } });

  const tierRowSum = form.layout.tiers.reduce((s, t) => s + Number(t.rows || 0), 0);
  const capacity = capacityOf({ ...form.layout, rows: Number(form.layout.rows) || 0, seatsPerRow: Number(form.layout.seatsPerRow) || 0 });
  const maxRevenue = form.layout.tiers.reduce((s, t) => s + Number(t.rows || 0) * Number(form.layout.seatsPerRow || 0) * Number(t.price || 0), 0);

  const save = async (submit) => {
    setErrors([]);
    const errs = submit || locked ? validateEvent(form) : form.title.trim() ? [] : ['Add an event name to save a draft.'];
    if (locked) errs.length = 0; // only description/venue editable
    if (errs.length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(true);
    try {
      const saved = await api.saveEvent(form);
      if (submit) await api.submitEvent(saved.id);
      navigate(`/organizer/events/${saved.id}`);
    } catch (e) {
      setErrors([e.message]);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        back={{ to: id ? `/organizer/events/${id}` : '/organizer/events', label: id ? 'Event' : 'My events' }}
        title={id ? `Edit ${form.title || 'event'}` : 'Create an event'}
        sub={locked ? 'Seats, prices and dates are locked once an event is submitted. You can still update the venue name and description.' : 'Fill in the details, set up your seats, then submit it for approval.'}
        actions={id && <StatusBadge status={status} />}
      />

      {rejection && status === 'REJECTED' && (
        <p className="notice bad"><strong>The FlashTix team asked for changes:</strong> {rejection}</p>
      )}
      {errors.length > 0 && (
        <div className="alert" role="alert">
          <strong>Fix these before continuing:</strong>
          <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="form-layout">
        <div className="form-main">
          <section className="panel form-panel">
            <h2>Event details</h2>
            <Field id="ev-title" label="Event name" value={form.title} onChange={set('title')} disabled={locked} placeholder="e.g. Indie Nights Vol. 3" />
            <div className="form-grid">
              <Field id="ev-cat" as="select" label="Type" value={form.category} onChange={set('category')} disabled={locked}>
                {EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Field>
              <Field id="ev-city" as="select" label="City" value={form.city} onChange={set('city')} disabled={locked}>
                {EVENT_CITIES.map((c) => <option key={c}>{c}</option>)}
              </Field>
            </div>
            <Field id="ev-venue" label="Venue" value={form.venue} onChange={set('venue')} placeholder="e.g. Moti Jheel Amphitheatre" />
            <Field id="ev-desc" as="textarea" rows="4" label="Description" value={form.description} onChange={set('description')} hint="What people should know: line-up, age limit, entry rules." />
          </section>

          <section className="panel form-panel">
            <h2>Dates and limits</h2>
            <div className="form-grid">
              <Field id="ev-start" type="datetime-local" label="Show starts" value={form.startsAt} onChange={set('startsAt')} disabled={locked} />
              <Field id="ev-sale" type="datetime-local" label="Ticket sale opens" value={form.saleOpensAt} onChange={set('saleOpensAt')} disabled={locked} hint="The flash sale countdown runs to this time." />
            </div>
            <Field
              id="ev-max"
              type="number"
              min="1"
              max={settings.maxPerUser}
              label="Tickets per person"
              value={form.maxPerUser}
              onChange={set('maxPerUser')}
              disabled={locked}
              hint={`Up to ${settings.maxPerUser}, the platform limit.`}
            />
          </section>

          <section className="panel form-panel">
            <h2>Seats and prices</h2>
            <div className="form-grid three">
              <Field id="ly-rows" type="number" min="1" max="26" label="Rows" value={form.layout.rows} onChange={setLayout('rows')} disabled={locked} hint="A to Z, front to back." />
              <Field id="ly-per" type="number" min="4" max="30" label="Seats per row" value={form.layout.seatsPerRow} onChange={setLayout('seatsPerRow')} disabled={locked} />
              <Field id="ly-aisle" type="number" min="0" label="Aisle after seat" value={form.layout.aisleAfter} onChange={setLayout('aisleAfter')} disabled={locked} hint="0 for no aisle." />
            </div>

            <h3 className="sub-h">Price tiers, front rows first</h3>
            <div className="tier-list">
              {form.layout.tiers.map((t, i) => (
                <div className="tier-row" key={i}>
                  <Field id={`t-name-${i}`} label="Tier name" value={t.name} onChange={setTier(i, 'name')} disabled={locked} placeholder="e.g. Gold" />
                  <Field id={`t-rows-${i}`} type="number" min="1" label="Rows" value={t.rows} onChange={setTier(i, 'rows')} disabled={locked} />
                  <Field id={`t-price-${i}`} type="number" min="1" label="Price (₹)" value={t.price} onChange={setTier(i, 'price')} disabled={locked} />
                  {!locked && form.layout.tiers.length > 1 && (
                    <button type="button" className="link-btn tier-remove" onClick={() => removeTier(i)} aria-label={`Remove tier ${t.name || i + 1}`}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="tier-foot">
              {!locked && <button type="button" className="btn btn-ghost btn-small" onClick={addTier} disabled={form.layout.tiers.length >= 5}>Add tier</button>}
              <span className={tierRowSum === Number(form.layout.rows) ? 'muted' : 'field-error'}>
                Tiers cover {tierRowSum} of {form.layout.rows || 0} rows
              </span>
            </div>
          </section>
        </div>

        <aside className="form-side">
          <section className="panel">
            <h2>Preview</h2>
            <LayoutPreview layout={form.layout} />
            <dl className="totals">
              <div><dt>Capacity</dt><dd>{capacity} seats</dd></div>
              <div><dt>If every seat sells</dt><dd>{formatINR(maxRevenue)}</dd></div>
            </dl>
          </section>
          <section className="panel sticky-actions">
            {locked ? (
              <button className="btn btn-block" onClick={() => save(false)} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
            ) : (
              <>
                <button className="btn btn-block" onClick={() => save(true)} disabled={busy}>{busy ? 'Saving…' : 'Submit for approval'}</button>
                <button className="btn btn-ghost btn-block" onClick={() => save(false)} disabled={busy}>Save as draft</button>
                <p className="fine">The FlashTix team usually reviews events within a day.</p>
              </>
            )}
            <Link to="/organizer/events" className="link-btn center">Cancel</Link>
          </section>
        </aside>
      </div>
    </>
  );
}
