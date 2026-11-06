import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import type { TripPlan } from '../types';
import { formatDate } from '../utils/format';
import { EmptyState, ErrorAlert, Loading } from '../components/StatusMessages';

export default function TripsPage() {
  const { data, loading, error, reload } = useApi<{ trips: TripPlan[] }>('/trips');
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(trip: TripPlan) {
    if (!window.confirm(`Delete "${trip.title}"?`)) return;
    setActionError(null);
    try {
      await api.delete(`/trips/${trip._id}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">My trip plans</h1>
        <Link to="/trips/new" className="btn btn-primary">
          New trip
        </Link>
      </div>
      <p className="small text-muted">Trip plans are private, only you can see them.</p>

      <ErrorAlert message={error} onRetry={reload} />
      <ErrorAlert message={actionError} />
      {loading && <Loading />}
      {!loading && data?.trips.length === 0 && (
        <EmptyState title="No trips planned yet">Start one with the "New trip" button.</EmptyState>
      )}

      <div className="list-group">
        {data?.trips.map((trip) => (
          <div key={trip._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <Link to={`/trips/${trip._id}`} className="fw-semibold">
                {trip.title}
              </Link>
              <div className="small text-muted">
                {formatDate(trip.startDate)} to {formatDate(trip.endDate)}
                {trip.destinations.length > 0 && ' · ' + trip.destinations.map((d) => d.city).join(', ')}
              </div>
            </div>
            <div className="d-flex gap-2">
              <Link to={`/trips/${trip._id}/edit`} className="btn btn-sm btn-outline-primary">
                Edit
              </Link>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(trip)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
