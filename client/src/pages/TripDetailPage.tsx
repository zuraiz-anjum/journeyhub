import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import type { TripDay, TripPlan } from '../types';
import { formatDate } from '../utils/format';
import { ErrorAlert, Loading, SuccessAlert } from '../components/StatusMessages';

const DAY_MS = 24 * 60 * 60 * 1000;

function buildDays(trip: TripPlan): TripDay[] {
  const count = Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / DAY_MS) + 1;
  return Array.from({ length: count }, (_, i) => {
    const saved = trip.days.find((d) => d.dayNumber === i + 1);
    return { dayNumber: i + 1, activities: saved ? [...saved.activities] : [] };
  });
}

export default function TripDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi<{ trip: TripPlan }>(`/trips/${id}`);

  const [days, setDays] = useState<TripDay[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (data?.trip) {
      setDays(buildDays(data.trip));
      setDirty(false);
    }
  }, [data]);

  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <>
        <ErrorAlert message={error} onRetry={reload} />
        <Link to="/trips">Back to my trips</Link>
      </>
    );
  }

  const trip = data.trip;

  function addActivity(dayNumber: number) {
    const text = (drafts[dayNumber] ?? '').trim();
    if (!text) return;
    setDays(days.map((d) => (d.dayNumber === dayNumber ? { ...d, activities: [...d.activities, text] } : d)));
    setDrafts({ ...drafts, [dayNumber]: '' });
    setDirty(true);
    setSuccess(null);
  }

  function removeActivity(dayNumber: number, index: number) {
    setDays(
      days.map((d) =>
        d.dayNumber === dayNumber ? { ...d, activities: d.activities.filter((_, i) => i !== index) } : d
      )
    );
    setDirty(true);
    setSuccess(null);
  }

  async function saveDays() {
    setSaving(true);
    setSaveError(null);
    try {
      // only send days that have something planned
      await api.put(`/trips/${trip._id}`, { days: days.filter((d) => d.activities.length > 0) });
      setDirty(false);
      setSuccess('Plan saved');
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link to="/trips" className="small">&larr; My trips</Link>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mt-2">
        <div>
          <h1 className="h3 mb-1">{trip.title}</h1>
          <p className="text-muted mb-1">
            {formatDate(trip.startDate)} to {formatDate(trip.endDate)} · {days.length} day{days.length === 1 ? '' : 's'}
          </p>
          {trip.destinations.length > 0 && (
            <p className="mb-1">
              {trip.destinations.map((d, i) => (
                <span key={d._id}>
                  {i > 0 && ', '}
                  <Link to={`/destinations/${d._id}`}>{d.city}</Link>
                </span>
              ))}
            </p>
          )}
          {trip.notes && <p className="small story-text">{trip.notes}</p>}
        </div>
        <Link to={`/trips/${trip._id}/edit`} className="btn btn-outline-primary btn-sm">
          Edit trip details
        </Link>
      </div>

      <h2 className="h5 mt-4">Day by day</h2>
      <ErrorAlert message={saveError} />
      <SuccessAlert message={success} />

      <div className="row g-3">
        {days.map((day) => {
          const date = new Date(new Date(trip.startDate).getTime() + (day.dayNumber - 1) * DAY_MS);
          return (
            <div className="col-md-6 col-xl-4" key={day.dayNumber}>
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between">
                  <strong>Day {day.dayNumber}</strong>
                  <span className="small text-muted">{formatDate(date)}</span>
                </div>
                <div className="card-body">
                  {day.activities.length === 0 && <p className="small text-muted">Nothing planned yet.</p>}
                  <ul className="list-unstyled mb-2">
                    {day.activities.map((activity, index) => (
                      <li key={index} className="d-flex justify-content-between align-items-center mb-1">
                        <span>{activity}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0"
                          aria-label={`Remove ${activity}`}
                          onClick={() => removeActivity(day.dayNumber, index)}
                        >
                          remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="input-group input-group-sm">
                    <input
                      className="form-control"
                      placeholder="Add an activity"
                      aria-label={`Add activity for day ${day.dayNumber}`}
                      maxLength={200}
                      value={drafts[day.dayNumber] ?? ''}
                      onChange={(e) => setDrafts({ ...drafts, [day.dayNumber]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addActivity(day.dayNumber);
                        }
                      }}
                    />
                    <button type="button" className="btn btn-outline-primary" onClick={() => addActivity(day.dayNumber)}>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 d-flex align-items-center gap-3">
        <button type="button" className="btn btn-primary" onClick={saveDays} disabled={saving || !dirty}>
          {saving ? 'Saving...' : 'Save plan'}
        </button>
        {dirty && <span className="small text-warning">You have unsaved changes</span>}
      </div>
    </>
  );
}
