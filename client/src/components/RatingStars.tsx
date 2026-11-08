// Read-only star display, e.g. 3.6 shows as four stars (rounded)
export default function RatingStars({ value, count }: { value: number | null; count?: number }) {
  if (value === null) {
    return <span className="text-muted small">No ratings yet</span>;
  }
  const rounded = Math.round(value);
  return (
    <span>
      <span className="rating-stars" aria-label={`${value} out of 5`}>
        {'★'.repeat(rounded)}
        {'☆'.repeat(5 - rounded)}
      </span>{' '}
      <span className="small text-muted">
        {value.toFixed(1)}
        {count !== undefined && ` (${count} review${count === 1 ? '' : 's'})`}
      </span>
    </span>
  );
}
