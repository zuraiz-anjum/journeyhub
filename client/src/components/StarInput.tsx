interface Props {
  value: number;
  onChange: (value: number) => void;
}

// Clickable 1 to 5 star picker
export default function StarInput({ value, onChange }: Props) {
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className={'btn btn-link p-0 me-1 text-decoration-none' + (n <= value ? ' on' : '')}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
