import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import type { Destination } from '../types';
import DestinationCard from '../components/DestinationCard';
import { EmptyState, ErrorAlert, Loading } from '../components/StatusMessages';

export default function DestinationsPage() {
  // filters live in the url so the back button and shared links keep them
  const [searchParams, setSearchParams] = useSearchParams();
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [minBudget, setMinBudget] = useState(searchParams.get('minBudget') ?? '');
  const [maxBudget, setMaxBudget] = useState(searchParams.get('maxBudget') ?? '');
  const [filterError, setFilterError] = useState<string | null>(null);

  const query = searchParams.toString();
  const { data, loading, error, reload } = useApi<{ destinations: Destination[] }>(
    '/destinations' + (query ? `?${query}` : '')
  );

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    if (minBudget && maxBudget && Number(minBudget) > Number(maxBudget)) {
      setFilterError('Minimum budget cannot be more than the maximum');
      return;
    }
    setFilterError(null);
    const params: Record<string, string> = {};
    if (city.trim()) params.city = city.trim();
    if (minBudget) params.minBudget = minBudget;
    if (maxBudget) params.maxBudget = maxBudget;
    setSearchParams(params);
  }

  function clearFilters() {
    setCity('');
    setMinBudget('');
    setMaxBudget('');
    setFilterError(null);
    setSearchParams({});
  }

  return (
    <>
      <h1 className="h3 mb-3">Destinations</h1>

      <form className="row g-2 align-items-end mb-4" onSubmit={applyFilters}>
        <div className="col-12 col-md-4">
          <label htmlFor="city" className="form-label small mb-1">City or country</label>
          <input
            id="city"
            className="form-control"
            placeholder="e.g. Lisbon"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="minBudget" className="form-label small mb-1">Min budget ($)</label>
          <input
            id="minBudget"
            type="number"
            min={0}
            className="form-control"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="maxBudget" className="form-label small mb-1">Max budget ($)</label>
          <input
            id="maxBudget"
            type="number"
            min={0}
            className="form-control"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-4 d-flex gap-2">
          <button type="submit" className="btn btn-primary">Search</button>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>Clear</button>
        </div>
      </form>

      <ErrorAlert message={filterError} />
      <ErrorAlert message={error} onRetry={reload} />
      {loading && <Loading text="Loading destinations..." />}

      {!loading && !error && data && data.destinations.length === 0 && (
        <EmptyState title="No destinations match your search">Try a different city or a wider budget.</EmptyState>
      )}

      {!loading && data && data.destinations.length > 0 && (
        <div className="row g-4">
          {data.destinations.map((d) => (
            <div className="col-12 col-sm-6 col-lg-4" key={d._id}>
              <DestinationCard destination={d} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
