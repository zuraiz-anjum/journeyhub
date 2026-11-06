import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import type { Destination, TripPlan } from '../types';
import { toDateInput } from '../utils/format';
import { validateTrip, type TripForm } from '../utils/validation';
import { ErrorAlert, Loading } from '../components/StatusMessages';

const emptyForm: TripForm = { title: '', startDate: '', endDate: '', destinations: [], notes: '' };

export default function TripFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<TripForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const destinations = useApi<{ destinations: Destination[] }>('/destinations');
  const existing = useApi<{ trip: TripPlan }>(isEdit ? `/trips/${id}` : null);

  useEffect(() => {
    const trip = existing.data?.trip;
    if (!trip) return;
    setForm({
      title: trip.title,
      startDate: toDateInput(trip.startDate),
      endDate: toDateInput(trip.endDate),
      destinations: trip.destinations.map((d) => d._id),
      notes: trip.notes,
    });
  }, [existing.data]);

  function toggleDestination(destId: string) {
    setForm((f) => ({
      ...f,
      destinations: f.destinations.includes(destId)
        ? f.destinations.filter((d) => d !== destId)
        : [...f.destinations, destId],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateTrip(form);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const body = { ...form, title: form.title.trim(), notes: form.notes.trim() };
      const res = isEdit
        ? await api.put<{ trip: TripPlan }>(`/trips/${id}`, body)
        : await api.post<{ trip: TripPlan }>('/trips', body);
      navigate(`/trips/${res.data.trip._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  if (isEdit && existing.loading) return <Loading />;
  if (isEdit && existing.error) return <ErrorAlert message={existing.error} />;

  return (
    <div className="col-lg-8 mx-auto">
      <h1 className="h3 mb-3">{isEdit ? 'Edit trip' : 'Plan a new trip'}</h1>
      <ErrorAlert message={error} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-12">
            <label htmlFor="title" className="form-label">Title</label>
            <input
              id="title"
              className="form-control"
              maxLength={120}
              placeholder="e.g. Summer in Portugal"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="col-sm-6">
            <label htmlFor="startDate" className="form-label">Start date</label>
            <input
              id="startDate"
              type="date"
              className="form-control"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="col-sm-6">
            <label htmlFor="endDate" className="form-label">End date</label>
            <input
              id="endDate"
              type="date"
              className="form-control"
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          <div className="col-12">
            <span className="form-label d-block">Destinations</span>
            {destinations.loading && <Loading />}
            <div className="d-flex flex-wrap gap-3">
              {destinations.data?.destinations.map((d) => (
                <div className="form-check" key={d._id}>
                  <input
                    id={`dest-${d._id}`}
                    type="checkbox"
                    className="form-check-input"
                    checked={form.destinations.includes(d._id)}
                    onChange={() => toggleDestination(d._id)}
                  />
                  <label htmlFor={`dest-${d._id}`} className="form-check-label">
                    {d.city}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="col-12">
            <label htmlFor="notes" className="form-label">Notes (optional)</label>
            <textarea
              id="notes"
              className="form-control"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {isEdit && (
          <p className="small text-muted mt-3 mb-0">
            If you make the trip shorter, activities on days after the new end date are removed.
          </p>
        )}
        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create trip'}
          </button>
          <Link to={isEdit ? `/trips/${id}` : '/trips'} className="btn btn-outline-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
