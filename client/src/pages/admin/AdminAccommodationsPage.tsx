import { useState, type FormEvent } from 'react';
import api, { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Accommodation, AccommodationType, Destination } from '../../types';
import { formatMoney } from '../../utils/format';
import { EmptyState, ErrorAlert, Loading, SuccessAlert } from '../../components/StatusMessages';

const TYPES: AccommodationType[] = ['hotel', 'hostel', 'guesthouse', 'apartment'];

interface FormState {
  destination: string;
  name: string;
  type: AccommodationType;
  pricePerNight: string;
  maxGuests: string;
  description: string;
}

const emptyForm: FormState = {
  destination: '',
  name: '',
  type: 'hotel',
  pricePerNight: '',
  maxGuests: '2',
  description: '',
};

function validate(form: FormState): string | null {
  if (!form.destination) return 'Please choose a destination';
  if (!form.name.trim()) return 'Name is required';
  const price = Number(form.pricePerNight);
  if (form.pricePerNight === '' || Number.isNaN(price) || price < 0) return 'Price per night must be 0 or more';
  const guests = Number(form.maxGuests);
  if (!Number.isInteger(guests) || guests < 1) return 'Max guests must be a whole number of 1 or more';
  return null;
}

export default function AdminAccommodationsPage() {
  const list = useApi<{ accommodations: Accommodation[] }>('/accommodations?includeInactive=true');
  const destinations = useApi<{ destinations: Destination[] }>('/destinations?includeArchived=true');

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function startEdit(a: Accommodation) {
    setEditingId(a._id);
    setForm({
      destination: a.destination?._id ?? '',
      name: a.name,
      type: a.type,
      pricePerNight: String(a.pricePerNight),
      maxGuests: String(a.maxGuests),
      description: a.description,
    });
    setError(null);
    setSuccess(null);
    window.scrollTo(0, 0);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate(form);
    setError(problem);
    setSuccess(null);
    if (problem) return;

    const body = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      pricePerNight: Number(form.pricePerNight),
      maxGuests: Number(form.maxGuests),
    };
    setSaving(true);
    try {
      if (editingId) await api.put(`/accommodations/${editingId}`, body);
      else await api.post('/accommodations', body);
      setSuccess(editingId ? 'Listing updated' : 'Listing added');
      resetForm();
      list.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(a: Accommodation) {
    setError(null);
    setSuccess(null);
    try {
      await api.put(`/accommodations/${a._id}`, { active: !a.active });
      list.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function remove(a: Accommodation) {
    if (!window.confirm(`Delete ${a.name}?`)) return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/accommodations/${a._id}`);
      setSuccess('Listing deleted');
      list.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">Accommodation listings</h1>

      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h6">{editingId ? 'Edit listing' : 'Add a listing'}</h2>
          <ErrorAlert message={error} />
          <SuccessAlert message={success} />
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-2">
              <div className="col-md-4">
                <label htmlFor="acc-dest" className="form-label small mb-1">Destination</label>
                <select
                  id="acc-dest"
                  className="form-select"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                >
                  <option value="">Choose...</option>
                  {destinations.data?.destinations.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.city}
                      {d.archived ? ' (archived)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
                <label htmlFor="acc-name" className="form-label small mb-1">Name</label>
                <input
                  id="acc-name"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <label htmlFor="acc-type" className="form-label small mb-1">Type</label>
                <select
                  id="acc-type"
                  className="form-select text-capitalize"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AccommodationType })}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label htmlFor="acc-price" className="form-label small mb-1">Price / night ($)</label>
                <input
                  id="acc-price"
                  type="number"
                  min={0}
                  className="form-control"
                  value={form.pricePerNight}
                  onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                />
              </div>
              <div className="col-6 col-md-2">
                <label htmlFor="acc-guests" className="form-label small mb-1">Max guests</label>
                <input
                  id="acc-guests"
                  type="number"
                  min={1}
                  className="form-control"
                  value={form.maxGuests}
                  onChange={(e) => setForm({ ...form, maxGuests: e.target.value })}
                />
              </div>
              <div className="col-md-8">
                <label htmlFor="acc-desc" className="form-label small mb-1">Description</label>
                <input
                  id="acc-desc"
                  className="form-control"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add listing'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <ErrorAlert message={list.error} onRetry={list.reload} />
      {list.loading && !list.data && <Loading />}
      {list.data?.accommodations.length === 0 && <EmptyState title="No listings yet" />}

      {list.data && list.data.accommodations.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Destination</th>
                <th>Price</th>
                <th>Guests</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data.accommodations.map((a) => (
                <tr key={a._id} className={a.active ? '' : 'text-muted'}>
                  <td>
                    {a.name}
                    <div className="small text-muted text-capitalize">{a.type}</div>
                  </td>
                  <td>{a.destination?.city ?? '-'}</td>
                  <td>{formatMoney(a.pricePerNight)}</td>
                  <td>{a.maxGuests}</td>
                  <td>
                    {a.active ? (
                      <span className="badge text-bg-success">Active</span>
                    ) : (
                      <span className="badge text-bg-secondary">Inactive</span>
                    )}
                  </td>
                  <td className="text-end text-nowrap">
                    <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => startEdit(a)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" onClick={() => toggleActive(a)}>
                      {a.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(a)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
