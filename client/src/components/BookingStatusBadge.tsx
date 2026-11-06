import type { BookingStatus } from '../types';

const COLOURS: Record<BookingStatus, string> = {
  Pending: 'text-bg-warning',
  Confirmed: 'text-bg-success',
  Rejected: 'text-bg-danger',
  Cancelled: 'text-bg-secondary',
};

export default function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`badge ${COLOURS[status]}`}>{status}</span>;
}
