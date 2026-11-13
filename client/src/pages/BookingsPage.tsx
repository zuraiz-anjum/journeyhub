import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import type { BookingRequest } from '../types';
import { formatDate, formatMoney, nightsBetween } from '../utils/format';
import BookingStatusBadge from '../components/BookingStatusBadge';
import { EmptyState, ErrorAlert, Loading, SuccessAlert } from '../components/StatusMessages';

export default function BookingsPage() {
  const { data, loading, error, reload } = useApi<{ bookings: BookingRequest[] }>('/bookings');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function cancel(booking: BookingRequest) {
    if (!window.confirm('Cancel this booking request?')) return;
    setBusyId(booking._id);
    setActionError(null);
    setSuccess(null);
    try {
      await api.patch(`/bookings/${booking._id}/cancel`);
      setSuccess('Request cancelled');
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">My booking requests</h1>
      <p className="small text-muted">
        Requests are only simulated, nothing is charged. You can cancel a request while it is still pending.
      </p>
      <ErrorAlert message={error} onRetry={reload} />
      <ErrorAlert message={actionError} />
      <SuccessAlert message={success} />
      {loading && !data && <Loading />}

      {data && data.bookings.length === 0 && (
        <EmptyState title="No booking requests yet">
          Find a place to stay on a <Link to="/destinations">destination</Link> page.
        </EmptyState>
      )}

      {data && data.bookings.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Place</th>
                <th className="d-none d-md-table-cell">Dates</th>
                <th className="d-none d-md-table-cell">Guests</th>
                <th className="d-none d-md-table-cell">Estimate</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    {b.accommodation ? (
                      <>
                        {b.accommodation.name}
                        <div className="small text-muted">{b.accommodation.destination?.city}</div>
                      </>
                    ) : (
                      <span className="text-muted">Listing removed</span>
                    )}
                    {/* on a phone the dates and guests go under the name instead of their own columns */}
                    <div className="small text-muted d-md-none">
                      {formatDate(b.checkIn)} to {formatDate(b.checkOut)} · {b.guests} guest{b.guests === 1 ? '' : 's'}
                    </div>
                  </td>
                  <td className="small d-none d-md-table-cell">
                    {formatDate(b.checkIn)} to {formatDate(b.checkOut)}
                  </td>
                  <td className="d-none d-md-table-cell">{b.guests}</td>
                  <td className="small d-none d-md-table-cell">
                    {b.accommodation
                      ? formatMoney(nightsBetween(b.checkIn, b.checkOut) * b.accommodation.pricePerNight)
                      : '-'}
                  </td>
                  <td>
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="text-end">
                    {b.status === 'Pending' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => cancel(b)}
                        disabled={busyId === b._id}
                      >
                        {busyId === b._id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
