import { Link } from 'react-router-dom';
import type { Destination } from '../types';
import { formatMoney } from '../utils/format';
import { FALLBACK_IMAGE } from '../utils/images';
import RatingStars from './RatingStars';

export default function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <div className="card h-100 shadow-sm">
      <img
        src={destination.imageUrl || FALLBACK_IMAGE}
        className="card-img-top cover"
        alt={destination.city}
        onError={(e) => {
          e.currentTarget.src = FALLBACK_IMAGE;
        }}
      />
      <div className="card-body d-flex flex-column">
        <h2 className="h5 card-title mb-0">{destination.city}</h2>
        {destination.country && <div className="text-muted small mb-2">{destination.country}</div>}
        <RatingStars value={destination.averageRating} count={destination.reviewCount} />
        <p className="card-text small mt-2 flex-grow-1">
          {destination.description.length > 110
            ? destination.description.slice(0, 110) + '...'
            : destination.description}
        </p>
        <div className="d-flex justify-content-between align-items-center">
          <span className="badge text-bg-light border">~{formatMoney(destination.estimatedBudget)}</span>
          <Link to={`/destinations/${destination._id}`} className="btn btn-sm btn-primary">
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}
