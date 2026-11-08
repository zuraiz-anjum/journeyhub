import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppSelector } from '../store';
import type { Review } from '../types';
import { formatDate } from '../utils/format';
import { validateRating } from '../utils/validation';
import StarInput from './StarInput';
import ReportButton from './ReportButton';
import { EmptyState, ErrorAlert, Loading, SuccessAlert } from './StatusMessages';

interface Props {
  destinationId: string;
  // called after the member adds, edits or deletes their review so the average can refresh
  onChanged: () => void;
}

export default function ReviewSection({ destinationId, onChanged }: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const isMember = user?.role === 'member';

  const list = useApi<{ reviews: Review[] }>(`/reviews?destination=${destinationId}`);
  const mine = useApi<{ review: Review | null }>(isMember ? `/reviews/mine?destination=${destinationId}` : null);
  const myReview = mine.data?.review ?? null;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setRating(myReview?.rating ?? 0);
    setComment(myReview?.comment ?? '');
  }, [myReview]);

  function refreshAll() {
    list.reload();
    mine.reload();
    onChanged();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateRating(rating);
    setError(problem);
    setSuccess(null);
    if (problem) return;

    setSaving(true);
    try {
      if (myReview) {
        await api.put(`/reviews/${myReview._id}`, { rating, comment: comment.trim() });
        setSuccess('Your review was updated');
      } else {
        await api.post('/reviews', { destination: destinationId, rating, comment: comment.trim() });
        setSuccess('Thanks for your review!');
      }
      refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!myReview || !window.confirm('Delete your review?')) return;
    setSaving(true);
    try {
      await api.delete(`/reviews/${myReview._id}`);
      setSuccess('Your review was deleted');
      refreshAll();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5">
      <h2 className="h4">Reviews</h2>

      {isMember && (
        <div className="card mb-4">
          <div className="card-body">
            <h3 className="h6">{myReview ? 'Your review' : 'Rate this destination'}</h3>
            {myReview?.hidden && (
              <div className="alert alert-secondary py-2 small">Your review was hidden by the admin.</div>
            )}
            <ErrorAlert message={error} />
            <SuccessAlert message={success} />
            {mine.loading ? (
              <Loading />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <StarInput value={rating} onChange={setRating} />
                <textarea
                  className="form-control mt-2"
                  rows={3}
                  maxLength={1000}
                  placeholder="What did you think? (optional)"
                  aria-label="Review comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="d-flex gap-2 mt-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? 'Saving...' : myReview ? 'Update review' : 'Post review'}
                  </button>
                  {myReview && (
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleDelete} disabled={saving}>
                      Delete
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {!user && (
        <p className="small">
          <Link to="/login">Log in</Link> to rate this destination.
        </p>
      )}

      <ErrorAlert message={list.error} onRetry={list.reload} />
      {list.loading && <Loading text="Loading reviews..." />}
      {!list.loading && list.data?.reviews.length === 0 && <EmptyState title="No reviews yet" />}

      <ul className="list-unstyled">
        {list.data?.reviews.map((review) => {
          const author = typeof review.author === 'string' ? null : review.author;
          const isMine = !!user && author?._id === user._id;
          return (
            <li key={review._id} className="border-bottom py-3">
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <strong>
                  {author ? author.name : 'deleted user'}
                  {isMine && <span className="badge text-bg-info ms-2">you</span>}
                </strong>
                <span className="small text-muted">{formatDate(review.updatedAt)}</span>
              </div>
              <div className="rating-stars">
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </div>
              {review.comment && <p className="mb-1">{review.comment}</p>}
              {isMember && !isMine && <ReportButton targetType="review" targetId={review._id} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
