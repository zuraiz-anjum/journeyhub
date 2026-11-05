import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import type { Destination } from '../types';
import { formatMoney } from '../utils/format';
import RatingStars from '../components/RatingStars';
import { FALLBACK_IMAGE } from '../utils/images';
import { ErrorAlert, Loading } from '../components/StatusMessages';

export default function DestinationDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useApi<{ destination: Destination }>(`/destinations/${id}`);

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <>
        <ErrorAlert message={error} onRetry={reload} />
        <Link to="/destinations">Back to destinations</Link>
      </>
    );
  }

  const destination = data.destination;

  return (
    <>
      <Link to="/destinations" className="small">&larr; All destinations</Link>
      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <img
            src={destination.imageUrl || FALLBACK_IMAGE}
            alt={destination.city}
            className="rounded detail-image mb-3"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          <h1 className="h2 mb-0">{destination.city}</h1>
          {destination.country && <p className="text-muted">{destination.country}</p>}
          {destination.archived && <div className="alert alert-secondary py-2">This destination is archived.</div>}
          <p>{destination.description}</p>
        </div>

        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-body">
              <div className="mb-2">
                <RatingStars value={destination.averageRating} count={destination.reviewCount} />
              </div>
              <p className="mb-0">
                Estimated budget: <strong>{formatMoney(destination.estimatedBudget)}</strong>
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h2 className="h5">Places to visit</h2>
              {destination.places.length === 0 ? (
                <p className="text-muted small mb-0">No places listed yet.</p>
              ) : (
                <ul className="mb-0">
                  {destination.places.map((place) => (
                    <li key={place}>{place}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
