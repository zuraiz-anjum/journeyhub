import { useEffect, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useAppDispatch } from './store';
import { fetchCurrentUser } from './store/authSlice';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import DestinationsPage from './pages/DestinationsPage';
import DestinationDetailPage from './pages/DestinationDetailPage';
import StoryFeedPage from './pages/StoryFeedPage';
import StoryDetailPage from './pages/StoryDetailPage';
import StoryFormPage from './pages/StoryFormPage';
import FavouritesPage from './pages/FavouritesPage';
import TripsPage from './pages/TripsPage';
import TripFormPage from './pages/TripFormPage';
import TripDetailPage from './pages/TripDetailPage';

const memberOnly = (page: ReactNode) => <ProtectedRoute role="member">{page}</ProtectedRoute>;

export default function App() {
  const dispatch = useAppDispatch();

  // restore the session from the cookie when the app first loads
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <>
      <NavBar />
      <main className="container pb-5">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/destinations/:id" element={<DestinationDetailPage />} />

          <Route path="/stories" element={<StoryFeedPage />} />
          <Route path="/stories/new" element={memberOnly(<StoryFormPage />)} />
          <Route path="/stories/:id" element={<StoryDetailPage />} />
          <Route path="/stories/:id/edit" element={memberOnly(<StoryFormPage />)} />

          <Route path="/favourites" element={memberOnly(<FavouritesPage />)} />

          <Route path="/trips" element={memberOnly(<TripsPage />)} />
          <Route path="/trips/new" element={memberOnly(<TripFormPage />)} />
          <Route path="/trips/:id" element={memberOnly(<TripDetailPage />)} />
          <Route path="/trips/:id/edit" element={memberOnly(<TripFormPage />)} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
