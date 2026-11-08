import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { logout } from '../store/authSlice';

export default function NavBar() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await dispatch(logout());
    setOpen(false);
    navigate('/');
  }

  const close = () => setOpen(false);
  const linkClass = ({ isActive }: { isActive: boolean }) => 'nav-link' + (isActive ? ' active' : '');

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/" onClick={close}>
          JourneyHub
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={'collapse navbar-collapse' + (open ? ' show' : '')}>
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <NavLink className={linkClass} to="/destinations" onClick={close}>
                Destinations
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className={linkClass} to="/stories" onClick={close}>
                Stories
              </NavLink>
            </li>
            {user?.role === 'member' && (
              <>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/dashboard" onClick={close}>
                    Dashboard
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/trips" onClick={close}>
                    My Trips
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/favourites" onClick={close}>
                    Saved
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/bookings" onClick={close}>
                    Bookings
                  </NavLink>
                </li>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/admin/destinations" onClick={close}>
                    Manage Destinations
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/admin/accommodations" onClick={close}>
                    Accommodations
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/admin/bookings" onClick={close}>
                    Booking Requests
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/admin/reports" onClick={close}>
                    Reports
                  </NavLink>
                </li>
              </>
            )}
          </ul>

          <ul className="navbar-nav">
            {user ? (
              <>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/profile" onClick={close}>
                    {user.name}
                    {user.role === 'admin' && <span className="badge bg-warning text-dark ms-1">admin</span>}
                  </NavLink>
                </li>
                <li className="nav-item">
                  <button type="button" className="btn btn-link nav-link" onClick={handleLogout}>
                    Log out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/login" onClick={close}>
                    Log in
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink className={linkClass} to="/register" onClick={close}>
                    Sign up
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
