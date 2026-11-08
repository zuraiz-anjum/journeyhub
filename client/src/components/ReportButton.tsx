import { useState, type FormEvent } from 'react';
import api, { getErrorMessage } from '../api/client';

interface Props {
  targetType: 'story' | 'review';
  targetId: string;
}

// Small "Report" link that opens a reason box underneath it.
export default function ReportButton({ targetType, targetId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('Please explain the problem in a few words');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.post('/reports', { targetType, targetId, reason: reason.trim() });
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (done) return <span className="small text-success">Thanks, the admin will review this.</span>;

  if (!open) {
    return (
      <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => setOpen(true)}>
        Report
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2" noValidate>
      <label htmlFor={`reason-${targetId}`} className="form-label small mb-1">
        Why are you reporting this {targetType}?
      </label>
      <textarea
        id={`reason-${targetId}`}
        className="form-control form-control-sm mb-2"
        rows={2}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && <div className="text-danger small mb-2">{error}</div>}
      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-sm btn-danger" disabled={sending}>
          {sending ? 'Sending...' : 'Send report'}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
