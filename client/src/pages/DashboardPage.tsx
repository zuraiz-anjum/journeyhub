import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAppSelector } from '../store';
import type { DashboardCounts, StoryPage } from '../types';
import { formatDate } from '../utils/format';
import { EmptyState, ErrorAlert, Loading, SuccessAlert } from '../components/StatusMessages';

function CountCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <div className="col-6 col-md-4 col-lg">
      <Link to={to} className="card text-decoration-none h-100">
        <div className="card-body text-center">
          <div className="display-6 fw-bold text-primary">{value}</div>
          <div className="small text-muted">{label}</div>
        </div>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const flash = (location.state as { message?: string } | null)?.message ?? null;

  const counts = useApi<{ counts: DashboardCounts }>('/users/me/dashboard');
  const myStories = useApi<StoryPage>('/stories?mine=true&limit=20');

  return (
    <>
      <h1 className="h3 mb-1">Hi {user?.name}!</h1>
      <p className="text-muted">Here is a quick look at your travels.</p>
      <SuccessAlert message={flash} />

      <ErrorAlert message={counts.error} onRetry={counts.reload} />
      {counts.loading && <Loading />}
      {counts.data && (
        <div className="row g-3 mb-4">
          <CountCard label="Stories" value={counts.data.counts.stories} to="/stories?mine=true" />
          <CountCard label="Saved places" value={counts.data.counts.savedPlaces} to="/favourites" />
          <CountCard label="Trip plans" value={counts.data.counts.tripPlans} to="/trips" />
          <CountCard label="Reviews" value={counts.data.counts.reviews} to="/destinations" />
          <CountCard label="Pending bookings" value={counts.data.counts.pendingBookings} to="/bookings" />
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="h5 mb-0">My stories</h2>
        <Link to="/stories/new" className="btn btn-sm btn-primary">
          Write a story
        </Link>
      </div>
      <ErrorAlert message={myStories.error} onRetry={myStories.reload} />
      {myStories.loading && <Loading />}
      {myStories.data?.stories.length === 0 && (
        <EmptyState title="You have not written any stories yet" />
      )}
      <ul className="list-group">
        {myStories.data?.stories.map((story) => (
          <li key={story._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <Link to={`/stories/${story._id}`}>{story.title}</Link>
              {story.hidden && <span className="badge text-bg-secondary ms-2">hidden</span>}
              <div className="small text-muted">
                {story.destination?.city} · {formatDate(story.travelDate)}
              </div>
            </div>
            <Link to={`/stories/${story._id}/edit`} className="btn btn-sm btn-outline-primary">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
