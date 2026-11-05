import { Link } from 'react-router-dom';
import { useAppSelector } from '../store';

export default function HomePage() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="py-4">
      <div className="p-4 p-md-5 mb-4 bg-light rounded-3 border">
        <h1 className="display-6 fw-bold">Plan trips and share your travels</h1>
        <p className="lead col-lg-8">
          Browse destinations, read what other travellers wrote about them, save the places you like and put
          together a day by day plan for your next trip.
        </p>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/destinations" className="btn btn-primary">
            Browse destinations
          </Link>
          <Link to="/stories" className="btn btn-outline-primary">
            Read stories
          </Link>
          {!user && (
            <Link to="/register" className="btn btn-outline-secondary">
              Join JourneyHub
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
