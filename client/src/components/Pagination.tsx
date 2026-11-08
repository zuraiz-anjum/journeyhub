interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pages" className="mt-4">
      <ul className="pagination justify-content-center flex-wrap">
        <li className={'page-item' + (page === 1 ? ' disabled' : '')}>
          <button type="button" className="page-link" onClick={() => onChange(page - 1)} disabled={page === 1}>
            Previous
          </button>
        </li>
        {pages.map((p) => (
          <li key={p} className={'page-item' + (p === page ? ' active' : '')}>
            <button type="button" className="page-link" onClick={() => onChange(p)}>
              {p}
            </button>
          </li>
        ))}
        <li className={'page-item' + (page === totalPages ? ' disabled' : '')}>
          <button
            type="button"
            className="page-link"
            onClick={() => onChange(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
