import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import type { Destination } from '../types';
import DestinationCard from '../components/DestinationCard';
import { EmptyState, ErrorAlert, Loading } from '../components/StatusMessages';

export default function FavouritesPage() {
  const { data, loading, error, reload } = useApi<{ destinations: Destination[] }>('/users/me/favourites');

  return (
    <>
      <h1 className="h3 mb-3">Saved places</h1>
      <ErrorAlert message={error} onRetry={reload} />
      {loading && <Loading />}
      {!loading && data?.destinations.length === 0 && (
        <EmptyState title="You have not saved any destinations yet">
          Open a <Link to="/destinations">destination</Link> and press "Save to favourites".
        </EmptyState>
      )}
      <div className="row g-4">
        {data?.destinations.map((d) => (
          <div className="col-12 col-sm-6 col-lg-4" key={d._id}>
            <DestinationCard destination={d} />
          </div>
        ))}
      </div>
    </>
  );
}
