import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store';
import type { Role } from '../types';
import { Loading } from './StatusMessages';

// Wraps pages that need a login. This only controls what the UI shows,
// the server checks the cookie and role again on every request.
export default function ProtectedRoute({ role, children }: { role?: Role; children: ReactNode }) {
  const { user, checked } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!checked) return <Loading text="Checking your session..." />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    return (
      <div className="alert alert-warning">
        This page is only for {role === 'admin' ? 'the admin' : 'members'}.
      </div>
    );
  }

  return <>{children}</>;
}
