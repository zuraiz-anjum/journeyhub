import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAppSelector } from '../store';
import type { Destination, StoryPage } from '../types';
import StoryCard from '../components/StoryCard';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorAlert, Loading } from '../components/StatusMessages';

const PAGE_SIZE = 6;

export default function StoryFeedPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '');

  // keep the search box and the select in step with the url (back button, navbar link)
  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
    setDestination(searchParams.get('destination') ?? '');
  }, [searchParams]);

  const params = new URLSearchParams(searchParams);
  params.set('limit', String(PAGE_SIZE));
  const { data, loading, error, reload } = useApi<StoryPage>(`/stories?${params.toString()}`);
  const destinations = useApi<{ destinations: Destination[] }>('/destinations');

  function search(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (q.trim()) next.q = q.trim();
    if (destination) next.destination = destination;
    setSearchParams(next);
  }

  function goToPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h1 className="h3 mb-0">Travel stories</h1>
        {user?.role === 'member' && (
          <Link to="/stories/new" className="btn btn-primary">
            Write a story
          </Link>
        )}
      </div>

      <form className="row g-2 mb-4" onSubmit={search}>
        <div className="col-12 col-md-5">
          <input
            className="form-control"
            placeholder="Search stories..."
            aria-label="Search stories"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-4">
          <select
            className="form-select"
            aria-label="Filter by destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">All destinations</option>
            {destinations.data?.destinations.map((d) => (
              <option key={d._id} value={d._id}>
                {d.city}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-3">
          <button type="submit" className="btn btn-outline-primary w-100">
            Search
          </button>
        </div>
      </form>

      <ErrorAlert message={error} onRetry={reload} />
      {loading && <Loading text="Loading stories..." />}

      {!loading && data && data.stories.length === 0 && (
        <EmptyState title="No stories found">
          {searchParams.toString() ? 'Try another search.' : 'Be the first to share a trip!'}
        </EmptyState>
      )}

      {!loading && data && data.stories.length > 0 && (
        <>
          <p className="small text-muted">
            {data.total} stor{data.total === 1 ? 'y' : 'ies'} found
          </p>
          <div className="row g-4">
            {data.stories.map((story) => (
              <div className="col-12 col-md-6 col-lg-4" key={story._id}>
                <StoryCard story={story} />
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
        </>
      )}
    </>
  );
}
