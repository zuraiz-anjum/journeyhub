import { useState, type FormEvent } from 'react';
import api, { getErrorMessage } from '../api/client';
import { useAppDispatch, useAppSelector } from '../store';
import { userUpdated } from '../store/authSlice';
import type { User } from '../types';
import { formatDate } from '../utils/format';
import { ErrorAlert, SuccessAlert } from '../components/StatusMessages';

export default function ProfilePage() {
  const user = useAppSelector((state) => state.auth.user)!;
  const dispatch = useAppDispatch();

  const [name, setName] = useState(user.name);
  const [homeCity, setHomeCity] = useState(user.homeCity);
  const [bio, setBio] = useState(user.bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await api.put<{ user: User }>('/users/me', {
        name: name.trim(),
        homeCity: homeCity.trim(),
        bio: bio.trim(),
      });
      dispatch(userUpdated(res.data.user));
      setSuccess('Profile saved');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col-lg-6 mx-auto">
      <h1 className="h3 mb-3">My profile</h1>
      <p className="text-muted small">
        {user.email} · {user.role} · joined {formatDate(user.createdAt)}
      </p>
      <ErrorAlert message={error} />
      <SuccessAlert message={success} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="name" className="form-label">Name</label>
          <input id="name" className="form-control" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="mb-3">
          <label htmlFor="homeCity" className="form-label">Home city</label>
          <input
            id="homeCity"
            className="form-control"
            maxLength={60}
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="bio" className="form-label">About me</label>
          <textarea
            id="bio"
            className="form-control"
            rows={4}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <div className="form-text">{bio.length}/500</div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
