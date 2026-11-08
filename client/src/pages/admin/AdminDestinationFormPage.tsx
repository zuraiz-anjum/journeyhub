import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Destination } from '../../types';
import { validateDestination, type DestinationForm } from '../../utils/validation';
import { ErrorAlert, Loading } from '../../components/StatusMessages';

const emptyForm: DestinationForm = {
  city: '',
  country: '',
  description: '',
  places: '',
  estimatedBudget: '',
  imageUrl: '',
};

export default function AdminDestinationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<DestinationForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const existing = useApi<{ destination: Destination }>(isEdit ? `/destinations/${id}` : null);

  useEffect(() => {
    const d = existing.data?.destination;
    if (!d) return;
    setForm({
      city: d.city,
      country: d.country,
      description: d.description,
      places: d.places.join('\n'),
      estimatedBudget: String(d.estimatedBudget),
      imageUrl: d.imageUrl,
    });
  }, [existing.data]);

  function update(field: keyof DestinationForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateDestination(form);
    setError(problem);
    if (problem) return;

    const body = {
      city: form.city.trim(),
      country: form.country.trim(),
      description: form.description.trim(),
      places: form.places.split('\n').map((p) => p.trim()).filter(Boolean),
      estimatedBudget: Number(form.estimatedBudget),
      imageUrl: form.imageUrl.trim(),
    };

    setSaving(true);
    try {
      if (isEdit) await api.put(`/destinations/${id}`, body);
      else await api.post('/destinations', body);
      navigate('/admin/destinations');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  if (isEdit && existing.loading) return <Loading />;
  if (isEdit && existing.error) return <ErrorAlert message={existing.error} />;

  return (
    <div className="col-lg-8 mx-auto">
      <h1 className="h3 mb-3">{isEdit ? 'Edit destination' : 'Add destination'}</h1>
      <ErrorAlert message={error} />
      <form onSubmit={handleSubmit} noValidate>
        <div className="row g-3">
          <div className="col-sm-6">
            <label htmlFor="city" className="form-label">City</label>
            <input id="city" className="form-control" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="col-sm-6">
            <label htmlFor="country" className="form-label">Country</label>
            <input
              id="country"
              className="form-control"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className="form-control"
              rows={4}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
          <div className="col-12">
            <label htmlFor="places" className="form-label">Places to visit (one per line)</label>
            <textarea
              id="places"
              className="form-control"
              rows={4}
              value={form.places}
              onChange={(e) => update('places', e.target.value)}
            />
          </div>
          <div className="col-sm-4">
            <label htmlFor="budget" className="form-label">Estimated budget ($)</label>
            <input
              id="budget"
              type="number"
              min={0}
              className="form-control"
              value={form.estimatedBudget}
              onChange={(e) => update('estimatedBudget', e.target.value)}
            />
          </div>
          <div className="col-sm-8">
            <label htmlFor="imageUrl" className="form-label">Image URL</label>
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
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add destination'}
          </button>
          <Link to="/admin/destinations" className="btn btn-outline-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
