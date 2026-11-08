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
