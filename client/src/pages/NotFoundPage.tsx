import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <h1 className="h3">Page not found</h1>
      <p className="text-muted">The page you were looking for does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </div>
  );
}
