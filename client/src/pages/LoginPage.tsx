import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { clearAuthError, login } from '../store/authSlice';
import { ErrorAlert } from '../components/StatusMessages';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { loading, error } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFormError('Please enter your email and password');
      return;
    }
    setFormError(null);
    const result = await dispatch(login({ email: email.trim(), password }));
    if (login.fulfilled.match(result)) {
      const home = result.payload.role === 'admin' ? '/admin/destinations' : '/dashboard';
      navigate(from || home, { replace: true });
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <h1 className="h3 mb-3">Log in</h1>
        <ErrorAlert message={formError || error} />
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="mt-3 small">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
