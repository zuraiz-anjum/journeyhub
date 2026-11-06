import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import type { Accommodation } from '../types';
import { formatMoney, nightsBetween, todayInput } from '../utils/format';
import { validateBooking, type BookingForm as Form } from '../utils/validation';
import { ErrorAlert } from './StatusMessages';

interface Props {
  accommodation: Accommodation;
  onCancel: () => void;
}

export default function BookingForm({ accommodation, onCancel }: Props) {
  const [form, setForm] = useState<Form>({ checkIn: '', checkOut: '', guests: '1', note: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const nights = form.checkIn && form.checkOut ? nightsBetween(form.checkIn, form.checkOut) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateBooking(form, accommodation.maxGuests);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      await api.post('/bookings', {
        accommodation: accommodation._id,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests),
        note: form.note.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (sent) {
    return (
      <div className="alert alert-success mt-3 mb-0">
        Request sent! It is pending until the admin confirms it. See <Link to="/bookings">my bookings</Link>.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border-top pt-3 mt-3" noValidate>
      <ErrorAlert message={error} />
      <div className="row g-2">
        <div className="col-sm-4">
          <label htmlFor={`in-${accommodation._id}`} className="form-label small mb-1">Check-in</label>
          <input
            id={`in-${accommodation._id}`}
            type="date"
            className="form-control form-control-sm"
            min={todayInput()}
            value={form.checkIn}
            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
          />
        </div>
        <div className="col-sm-4">
          <label htmlFor={`out-${accommodation._id}`} className="form-label small mb-1">Check-out</label>
          <input
            id={`out-${accommodation._id}`}
            type="date"
            className="form-control form-control-sm"
            min={form.checkIn || todayInput()}
            value={form.checkOut}
            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
          />
        </div>
        <div className="col-sm-4">
          <label htmlFor={`guests-${accommodation._id}`} className="form-label small mb-1">
            Guests (max {accommodation.maxGuests})
          </label>
          <input
            id={`guests-${accommodation._id}`}
            type="number"
            min={1}
            max={accommodation.maxGuests}
            className="form-control form-control-sm"
            value={form.guests}
            onChange={(e) => setForm({ ...form, guests: e.target.value })}
          />
        </div>
        <div className="col-12">
          <input
            className="form-control form-control-sm"
            placeholder="Note for the host (optional)"
            aria-label="Note"
            maxLength={500}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
      </div>
      {nights > 0 && (
        <p className="small text-muted mt-2 mb-0">
          {nights} night{nights === 1 ? '' : 's'}, about {formatMoney(nights * accommodation.pricePerNight)} (no payment
          is taken)
        </p>
      )}
      <div className="d-flex gap-2 mt-2">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
          {saving ? 'Sending...' : 'Send request'}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
