export function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // dates are stored as UTC midnight, so format in UTC to avoid showing the day before
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// value for <input type="date">
export function toDateInput(value: string | Date | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString('en-US');
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}
