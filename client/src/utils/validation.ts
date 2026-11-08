// Form checks that mirror the server rules. The server checks everything again,
// these are here so the user gets feedback before a request is sent.

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true; // optional fields
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface StoryForm {
  destination: string;
  title: string;
  travelDate: string;
  text: string;
  imageUrl: string;
}

export function validateStory(form: StoryForm): string | null {
  if (!form.destination) return 'Please choose a destination';
  if (!form.title.trim()) return 'Please give your story a title';
  if (form.title.trim().length > 120) return 'Title must be 120 characters or less';
  if (!form.travelDate) return 'Please enter the date you travelled';
  if (form.travelDate > new Date().toISOString().slice(0, 10)) return 'Travel date cannot be in the future';
  if (!form.text.trim()) return 'Please write something about your trip';
  if (!isValidUrl(form.imageUrl)) return 'Image URL must start with http:// or https://';
  return null;
}

export function validateRating(rating: number): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'Please pick a rating from 1 to 5 stars';
  return null;
}

export const MAX_TRIP_DAYS = 60;

export interface TripForm {
  title: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  notes: string;
}

export function validateTrip(form: TripForm): string | null {
  if (!form.title.trim()) return 'Please give the trip a title';
  if (!form.startDate || !form.endDate) return 'Please pick a start and an end date';
  if (form.endDate < form.startDate) return 'End date cannot be before the start date';
  const days = (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000 + 1;
  if (days > MAX_TRIP_DAYS) return `Trips can be at most ${MAX_TRIP_DAYS} days long`;
  return null;
}

export interface BookingForm {
  checkIn: string;
  checkOut: string;
  guests: string;
  note: string;
}

export function validateBooking(form: BookingForm, maxGuests: number): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (!form.checkIn || !form.checkOut) return 'Please pick check-in and check-out dates';
  if (form.checkIn < today) return 'Check-in date cannot be in the past';
  if (form.checkOut <= form.checkIn) return 'Check-out must be at least one day after check-in';
  const guests = Number(form.guests);
  if (!Number.isInteger(guests) || guests < 1) return 'Guests must be a whole number of 1 or more';
  if (guests > maxGuests) return `This place takes at most ${maxGuests} guests`;
  return null;
}
