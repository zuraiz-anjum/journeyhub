import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { clearAuthError, register } from '../store/authSlice';
import { ErrorAlert } from '../components/StatusMessages';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const { user, loading, error } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  function update(field: keyof typeof form, value: string) {
    setForm({ ...form, [field]: value });
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Please enter a valid email';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (form.password !== form.confirm) return 'Passwords do not match';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    setFormError(problem);
    if (problem) return;

    const result = await dispatch(
      register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
    );
    if (register.fulfilled.match(result)) navigate('/dashboard', { replace: true });
  }

  // already logged in, no need to show the form
  if (user && !loading) {
    return <Navigate to={user.role === 'admin' ? '/admin/destinations' : '/dashboard'} replace />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <h1 className="h3 mb-3">Create an account</h1>
        <ErrorAlert message={formError || error} />
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Name</label>
            <input id="name" className="form-control" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              autoComplete="new-password"
            />
            <div className="form-text">At least 6 characters.</div>
          </div>
          <div className="mb-3">
            <label htmlFor="confirm" className="form-label">Confirm password</label>
            <input
              id="confirm"
              type="password"
              className="form-control"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p className="mt-3 small">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
