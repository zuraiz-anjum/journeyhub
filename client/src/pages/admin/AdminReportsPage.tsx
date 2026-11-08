import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import type { Report, ReportStatus } from '../../types';
import { formatDate } from '../../utils/format';
import { EmptyState, ErrorAlert, Loading, SuccessAlert } from '../../components/StatusMessages';

const FILTERS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'hidden', label: 'Content hidden' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
];

export default function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus | 'all'>('open');
  const { data, loading, error, reload } = useApi<{ reports: Report[] }>(`/reports?status=${status}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function resolve(report: Report, action: 'dismiss' | 'hide') {
    if (action === 'hide' && !window.confirm(`Hide this ${report.targetType} from everyone?`)) return;
    setBusyId(report._id);
    setActionError(null);
    setSuccess(null);
    try {
      await api.patch(`/reports/${report._id}`, { action });
      setSuccess(action === 'hide' ? `The ${report.targetType} is now hidden` : 'Report dismissed');
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h1 className="h3 mb-3">Reported content</h1>

      <div className="btn-group mb-3 flex-wrap" role="group" aria-label="Filter reports">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={'btn btn-sm ' + (status === f.value ? 'btn-primary' : 'btn-outline-primary')}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ErrorAlert message={error} onRetry={reload} />
      <ErrorAlert message={actionError} />
      <SuccessAlert message={success} />
      {loading && <Loading />}
      {!loading && data?.reports.length === 0 && <EmptyState title="No reports here" />}

      {!loading &&
        data?.reports.map((report) => (
          <div className="card mb-3" key={report._id}>
            <div className="card-body">
              <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                <div>
                  <span className="badge text-bg-dark text-capitalize me-2">{report.targetType}</span>
                  <span className="small text-muted">
                    reported by {report.reporter?.name ?? 'deleted user'} on {formatDate(report.createdAt)}
                  </span>
                </div>
                <span className="badge text-bg-light border text-capitalize">{report.status}</span>
              </div>

              <p className="mb-2">
                <strong>Reason:</strong> {report.reason}
              </p>

              {report.target ? (
                <blockquote className="border-start border-3 ps-3 small text-muted">
                  {report.target.title && <div className="fw-semibold text-body">{report.target.title}</div>}
                  {report.target.rating !== undefined && <div>Rating: {report.target.rating} / 5</div>}
                  <div>{report.target.text || <em>(no text)</em>}</div>
                  <div className="mt-1">by {report.target.author?.name ?? 'deleted user'}</div>
                  {report.targetType === 'story' && (
                    <Link to={`/stories/${report.targetId}`}>Open story</Link>
                  )}
                </blockquote>
              ) : (
                <p className="small text-muted">The reported content has been deleted by its author.</p>
              )}

              {report.status === 'open' && (
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={busyId === report._id || !report.target}
                    onClick={() => resolve(report, 'hide')}
                  >
                    Hide content
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busyId === report._id}
                    onClick={() => resolve(report, 'dismiss')}
                  >
                    Dismiss report
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
    </>
  );
}
