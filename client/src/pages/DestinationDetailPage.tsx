import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppSelector } from '../store';
import type { Destination } from '../types';
import { formatMoney } from '../utils/format';
import RatingStars from '../components/RatingStars';
import { FALLBACK_IMAGE } from '../utils/images';
import { ErrorAlert, Loading } from '../components/StatusMessages';
import ReviewSection from '../components/ReviewSection';
import AccommodationList from '../components/AccommodationList';

export default function DestinationDetailPage() {
  const { id } = useParams();
  const user = useAppSelector((state) => state.auth.user);
  const { data, loading, error, reload, setData } = useApi<{ destination: Destination }>(`/destinations/${id}`);
  const [savingFav, setSavingFav] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);

  // only show the spinner on the first load, reloads keep the page on screen
  if (loading && !data) return <Loading />;
  if (error || !data) {
    return (
      <>
        <ErrorAlert message={error} onRetry={reload} />
        <Link to="/destinations">Back to destinations</Link>
      </>
    );
  }

  const destination = data.destination;

  async function toggleFavourite() {
    setSavingFav(true);
    setFavError(null);
    try {
      if (destination.isFavourite) {
        await api.delete(`/users/me/favourites/${destination._id}`);
      } else {
        await api.post(`/users/me/favourites/${destination._id}`);
      }
      setData({ destination: { ...destination, isFavourite: !destination.isFavourite } });
    } catch (err) {
      setFavError(getErrorMessage(err));
    } finally {
      setSavingFav(false);
    }
  }

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
              <p className="mb-2">
                Estimated budget: <strong>{formatMoney(destination.estimatedBudget)}</strong>
              </p>
              {user?.role === 'member' && (
                <button
                  type="button"
                  className={'btn btn-sm ' + (destination.isFavourite ? 'btn-success' : 'btn-outline-success')}
                  onClick={toggleFavourite}
                  disabled={savingFav}
                >
                  {destination.isFavourite ? '♥ Saved' : '♡ Save to favourites'}
                </button>
              )}
              {favError && <div className="text-danger small mt-2">{favError}</div>}
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

      <p className="mt-3">
        <Link to={`/stories?destination=${destination._id}`}>Read travel stories about {destination.city} &rarr;</Link>
      </p>

      <AccommodationList destinationId={destination._id} />
      <ReviewSection destinationId={destination._id} onChanged={reload} />
    </>
  );
}
