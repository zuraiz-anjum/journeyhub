import type { ReactNode } from 'react';

export function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="d-flex align-items-center gap-2 text-muted py-4" role="status">
      <div className="spinner-border spinner-border-sm" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function ErrorAlert({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function SuccessAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert-success" role="status">
      {message}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="text-center text-muted border rounded py-5 px-3 bg-light">
      <p className="fw-semibold mb-1">{title}</p>
      {children && <div className="small">{children}</div>}
    </div>
  );
}
