import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppSelector } from '../store';
import type { Story } from '../types';
import { formatDate } from '../utils/format';
import { ErrorAlert, Loading } from '../components/StatusMessages';

export default function StoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { data, loading, error, reload } = useApi<{ story: Story }>(`/stories/${id}`);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <>
        <ErrorAlert message={error} onRetry={reload} />
        <Link to="/stories">Back to stories</Link>
      </>
    );
  }

  const story = data.story;
  const isOwner = !!user && story.author?._id === user._id;

  async function handleDelete() {
    if (!window.confirm('Delete this story? This cannot be undone.')) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/stories/${story._id}`);
      navigate('/dashboard', { state: { message: 'Story deleted' } });
    } catch (err) {
      setActionError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <article className="col-lg-9 mx-auto">
      <Link to="/stories" className="small">&larr; All stories</Link>
      <h1 className="h2 mt-2">{story.title}</h1>
      <p className="text-muted">
        {story.destination && (
          <Link to={`/destinations/${story.destination._id}`}>{story.destination.city}</Link>
        )}{' '}
        · travelled {formatDate(story.travelDate)} · by {story.author ? story.author.name : 'deleted user'}
      </p>

      {story.hidden && (
        <div className="alert alert-secondary">This story was hidden by the admin after a report.</div>
      )}
      <ErrorAlert message={actionError} />

      {story.imageUrl && (
        <img
          src={story.imageUrl}
          alt=""
          className="rounded detail-image mb-3"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <p className="story-text">{story.text}</p>

      {isOwner && (
        <div className="d-flex gap-2 mt-4">
          <Link to={`/stories/${story._id}/edit`} className="btn btn-outline-primary">
            Edit
          </Link>
          <button type="button" className="btn btn-outline-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </article>
  );
}
