import { useState } from 'react';
import api, { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { BookingRequest, BookingStatus } from '../../types';
import { formatDate } from '../../utils/format';
import BookingStatusBadge from '../../components/BookingStatusBadge';
import { EmptyState, ErrorAlert, Loading, SuccessAlert } from '../../components/StatusMessages';

const FILTERS: (BookingStatus | '')[] = ['Pending', 'Confirmed', 'Rejected', 'Cancelled', ''];

export default function AdminBookingsPage() {
  const [status, setStatus] = useState<BookingStatus | ''>('Pending');
  const { data, loading, error, reload } = useApi<{ bookings: BookingRequest[] }>(
    '/bookings' + (status ? `?status=${status}` : '')
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function decide(booking: BookingRequest, next: 'Confirmed' | 'Rejected') {
    setBusyId(booking._id);
    setActionError(null);
    setSuccess(null);
    try {
      await api.patch(`/bookings/${booking._id}/status`, { status: next });
      setSuccess(`Request from ${booking.member?.name ?? 'member'} ${next.toLowerCase()}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">Booking requests</h1>
      <div className="btn-group mb-3 flex-wrap" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f || 'all'}
            type="button"
            className={'btn btn-sm ' + (status === f ? 'btn-primary' : 'btn-outline-primary')}
            onClick={() => setStatus(f)}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      <ErrorAlert message={error} onRetry={reload} />
      <ErrorAlert message={actionError} />
      <SuccessAlert message={success} />
      {loading && <Loading />}
      {!loading && data?.bookings.length === 0 && <EmptyState title="No booking requests here" />}

      {!loading && data && data.bookings.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Member</th>
                <th>Place</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    {b.member?.name ?? 'deleted user'}
                    <div className="small text-muted">{b.member?.email}</div>
                  </td>
                  <td>
                    {b.accommodation?.name ?? 'Listing removed'}
                    <div className="small text-muted">{b.accommodation?.destination?.city}</div>
                  </td>
                  <td className="small">
                    {formatDate(b.checkIn)} to {formatDate(b.checkOut)}
                    {b.note && <div className="text-muted">"{b.note}"</div>}
                  </td>
                  <td>{b.guests}</td>
                  <td>
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="text-end text-nowrap">
                    {b.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-success me-1"
                          disabled={busyId === b._id}
                          onClick={() => decide(b, 'Confirmed')}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          disabled={busyId === b._id}
                          onClick={() => decide(b, 'Rejected')}
                        >
                          Reject
                        </button>
                      </>
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
