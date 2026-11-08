import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAppSelector } from '../store';
import type { Destination, Story } from '../types';
import { toDateInput, todayInput } from '../utils/format';
import { validateStory, type StoryForm } from '../utils/validation';
import { ErrorAlert, Loading } from '../components/StatusMessages';

const emptyForm: StoryForm = { destination: '', title: '', travelDate: '', text: '', imageUrl: '' };

// Used for both "new story" and "edit story" (when there is an :id in the url)
export default function StoryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const [form, setForm] = useState<StoryForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

  const destinations = useApi<{ destinations: Destination[] }>('/destinations');
  const existing = useApi<{ story: Story }>(isEdit ? `/stories/${id}` : null);

  // fill the form once the story we are editing has loaded
  useEffect(() => {
    const story = existing.data?.story;
    if (!story) return;
    if (user && story.author._id !== user._id) {
      setNotOwner(true);
      return;
    }
    setForm({
      destination: story.destination?._id ?? '',
      title: story.title,
      travelDate: toDateInput(story.travelDate),
      text: story.text,
      imageUrl: story.imageUrl,
    });
  }, [existing.data, user]);

  function update(field: keyof StoryForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateStory(form);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const body = { ...form, title: form.title.trim(), text: form.text.trim(), imageUrl: form.imageUrl.trim() };
      const res = isEdit
        ? await api.put<{ story: Story }>(`/stories/${id}`, body)
        : await api.post<{ story: Story }>('/stories', body);
      navigate(`/stories/${res.data.story._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  if (isEdit && existing.loading) return <Loading />;
  if (isEdit && existing.error) return <ErrorAlert message={existing.error} />;
  if (notOwner) return <div className="alert alert-warning">You can only edit your own stories.</div>;

  return (
    <div className="col-lg-8 mx-auto">
      <h1 className="h3 mb-3">{isEdit ? 'Edit story' : 'Share a travel story'}</h1>
      <ErrorAlert message={error} />
      <ErrorAlert message={destinations.error} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="destination" className="form-label">Destination</label>
            <select
              id="destination"
              className="form-select"
              value={form.destination}
              onChange={(e) => update('destination', e.target.value)}
              disabled={destinations.loading}
            >
              <option value="">{destinations.loading ? 'Loading...' : 'Choose a destination'}</option>
              {destinations.data?.destinations.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.city}
                  {d.country ? `, ${d.country}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="travelDate" className="form-label">Travel date</label>
            <input
              id="travelDate"
              type="date"
              className="form-control"
              max={todayInput()}
              value={form.travelDate}
              onChange={(e) => update('travelDate', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label htmlFor="title" className="form-label">Title</label>
            <input
              id="title"
              className="form-control"
              maxLength={120}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label htmlFor="text" className="form-label">Your story</label>
            <textarea
              id="text"
              className="form-control"
              rows={8}
              value={form.text}
              onChange={(e) => update('text', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label htmlFor="imageUrl" className="form-label">Image URL (optional)</label>
            <input
              id="imageUrl"
              type="url"
              className="form-control"
              placeholder="https://..."
              value={form.imageUrl}
              onChange={(e) => update('imageUrl', e.target.value)}
            />
          </div>
        </div>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Publish story'}
          </button>
          <Link to={isEdit ? `/stories/${id}` : '/stories'} className="btn btn-outline-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
