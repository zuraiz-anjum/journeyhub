import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Destination } from '../../types';
import { formatMoney } from '../../utils/format';
import { EmptyState, ErrorAlert, Loading, SuccessAlert } from '../../components/StatusMessages';

export default function AdminDestinationsPage() {
  const { data, loading, error, reload } = useApi<{ destinations: Destination[] }>(
    '/destinations?includeArchived=true'
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function setArchived(destination: Destination, archived: boolean) {
    setBusyId(destination._id);
    setActionError(null);
    setSuccess(null);
    try {
      await api.patch(`/destinations/${destination._id}/archive`, { archived });
      setSuccess(`${destination.city} was ${archived ? 'archived' : 'restored'}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Manage destinations</h1>
        <Link to="/admin/destinations/new" className="btn btn-primary">
          Add destination
        </Link>
      </div>
      <p className="small text-muted">
        Archived destinations are hidden from members but their stories and reviews are kept.
      </p>

      <ErrorAlert message={error} onRetry={reload} />
      <ErrorAlert message={actionError} />
      <SuccessAlert message={success} />
      {loading && !data && <Loading />}
      {data?.destinations.length === 0 && <EmptyState title="No destinations yet" />}

      {data && data.destinations.length > 0 && (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>City</th>
                <th className="d-none d-sm-table-cell">Budget</th>
                <th className="d-none d-sm-table-cell">Rating</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.destinations.map((d) => (
                <tr key={d._id} className={d.archived ? 'text-muted' : ''}>
                  <td>
                    <Link to={`/destinations/${d._id}`}>{d.city}</Link>
                    <div className="small text-muted">{d.country}</div>
                  </td>
                  <td className="d-none d-sm-table-cell">{formatMoney(d.estimatedBudget)}</td>
                  <td className="d-none d-sm-table-cell">{d.averageRating === null ? '-' : `${d.averageRating} (${d.reviewCount})`}</td>
                  <td>
                    {d.archived ? (
                      <span className="badge text-bg-secondary">Archived</span>
                    ) : (
                      <span className="badge text-bg-success">Live</span>
                    )}
                  </td>
                  <td className="text-end">
                    <div className="d-flex flex-column flex-sm-row gap-1 justify-content-end">
                      <Link to={`/admin/destinations/${d._id}/edit`} className="btn btn-sm btn-outline-primary">
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={busyId === d._id}
                        onClick={() => setArchived(d, !d.archived)}
                      >
                        {d.archived ? 'Restore' : 'Archive'}
                      </button>
                    </div>
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
