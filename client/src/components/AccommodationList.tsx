import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAppSelector } from '../store';
import type { Accommodation } from '../types';
import { formatMoney } from '../utils/format';
import BookingForm from './BookingForm';
import { EmptyState, ErrorAlert, Loading } from './StatusMessages';

export default function AccommodationList({ destinationId }: { destinationId: string }) {
  const user = useAppSelector((state) => state.auth.user);
  const { data, loading, error, reload } = useApi<{ accommodations: Accommodation[] }>(
    `/accommodations?destination=${destinationId}`
  );
  // id of the listing whose booking form is open
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="mt-5">
      <h2 className="h4">Where to stay</h2>
      <ErrorAlert message={error} onRetry={reload} />
      {loading && <Loading />}
      {!loading && data?.accommodations.length === 0 && <EmptyState title="No places to stay listed yet" />}

      <div className="row g-3">
        {data?.accommodations.map((a) => (
          <div className="col-12" key={a._id}>
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between flex-wrap gap-2">
                  <div>
                    <h3 className="h6 mb-1">
                      {a.name} <span className="badge text-bg-light border text-capitalize">{a.type}</span>
                    </h3>
                    <div className="small text-muted">
                      {formatMoney(a.pricePerNight)} per night · up to {a.maxGuests} guest{a.maxGuests === 1 ? '' : 's'}
                    </div>
                    {a.description && <p className="small mb-0 mt-1">{a.description}</p>}
                  </div>
                  <div>
                    {user?.role === 'member' && openId !== a._id && (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setOpenId(a._id)}>
                        Request to book
                      </button>
                    )}
                    {!user && (
                      <Link to="/login" className="small">
                        Log in to book
                      </Link>
                    )}
                  </div>
                </div>
                {openId === a._id && <BookingForm accommodation={a} onCancel={() => setOpenId(null)} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
