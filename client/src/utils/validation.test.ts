import { describe, expect, it } from 'vitest';
import {
  isValidUrl,
  validateBooking,
  validateDestination,
  validateRating,
  validateStory,
  validateTrip,
  type BookingForm,
  type StoryForm,
  type TripForm,
} from './validation';
import { dateFromToday } from '../test/utils';

describe('isValidUrl', () => {
  it('accepts empty (optional) and http/https links', () => {
    expect(isValidUrl('')).toBe(true);
    expect(isValidUrl('http://example.com/a.jpg')).toBe(true);
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('rejects other schemes and plain text', () => {
    expect(isValidUrl('ftp://example.com/a.jpg')).toBe(false);
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('validateStory', () => {
  const good: StoryForm = {
    destination: 'd1',
    title: 'Apricot season',
    travelDate: dateFromToday(-5),
    text: 'Long drive, great views.',
    imageUrl: '',
  };

  it('passes a complete story', () => {
    expect(validateStory(good)).toBeNull();
  });

  it('needs every required field', () => {
    expect(validateStory({ ...good, destination: '' })).toBe('Please choose a destination');
    expect(validateStory({ ...good, title: '   ' })).toBe('Please give your story a title');
    expect(validateStory({ ...good, travelDate: '' })).toBe('Please enter the date you travelled');
    expect(validateStory({ ...good, text: '\n ' })).toBe('Please write something about your trip');
  });

  it('limits the title to 120 characters', () => {
    expect(validateStory({ ...good, title: 'a'.repeat(121) })).toBe('Title must be 120 characters or less');
    expect(validateStory({ ...good, title: 'a'.repeat(120) })).toBeNull();
  });

  it('allows today but not a future travel date', () => {
    expect(validateStory({ ...good, travelDate: dateFromToday(0) })).toBeNull();
    expect(validateStory({ ...good, travelDate: dateFromToday(1) })).toBe('Travel date cannot be in the future');
  });

  it('checks the image link', () => {
    expect(validateStory({ ...good, imageUrl: 'www.example.com/pic.jpg' })).toBe(
      'Image URL must start with http:// or https://'
    );
  });
});

describe('validateRating', () => {
  it('accepts whole numbers from 1 to 5', () => {
    for (const r of [1, 2, 3, 4, 5]) expect(validateRating(r)).toBeNull();
  });

  it('rejects no rating, out of range and half stars', () => {
    for (const r of [0, 6, -1, 2.5, NaN]) {
      expect(validateRating(r)).toBe('Please pick a rating from 1 to 5 stars');
    }
  });
});

describe('validateTrip', () => {
  const good: TripForm = { title: 'Hunza', startDate: '2027-05-01', endDate: '2027-05-04', destinations: [], notes: '' };

  it('passes a normal trip, also a one day trip', () => {
    expect(validateTrip(good)).toBeNull();
    expect(validateTrip({ ...good, endDate: good.startDate })).toBeNull();
  });

  it('needs a title and both dates', () => {
    expect(validateTrip({ ...good, title: ' ' })).toBe('Please give the trip a title');
    expect(validateTrip({ ...good, startDate: '' })).toBe('Please pick a start and an end date');
    expect(validateTrip({ ...good, endDate: '' })).toBe('Please pick a start and an end date');
  });

  it('rejects an end date before the start date', () => {
    expect(validateTrip({ ...good, endDate: '2027-04-30' })).toBe('End date cannot be before the start date');
  });

  it('allows 60 days but not 61', () => {
    expect(validateTrip({ ...good, startDate: '2027-01-01', endDate: '2027-03-01' })).toBeNull();
    expect(validateTrip({ ...good, startDate: '2027-01-01', endDate: '2027-03-02' })).toBe(
      'Trips can be at most 60 days long'
    );
  });
});

describe('validateBooking', () => {
  const good: BookingForm = { checkIn: dateFromToday(10), checkOut: dateFromToday(12), guests: '2', note: '' };

  it('passes a normal request, also one starting today', () => {
    expect(validateBooking(good, 4)).toBeNull();
    expect(validateBooking({ ...good, checkIn: dateFromToday(0), checkOut: dateFromToday(1) }, 4)).toBeNull();
  });

  it('needs both dates', () => {
    expect(validateBooking({ ...good, checkIn: '' }, 4)).toBe('Please pick check-in and check-out dates');
    expect(validateBooking({ ...good, checkOut: '' }, 4)).toBe('Please pick check-in and check-out dates');
  });

  it('rejects a check-in in the past', () => {
    expect(validateBooking({ ...good, checkIn: dateFromToday(-1) }, 4)).toBe('Check-in date cannot be in the past');
  });

  it('needs at least one night', () => {
    const msg = 'Check-out must be at least one day after check-in';
    expect(validateBooking({ ...good, checkOut: good.checkIn }, 4)).toBe(msg);
    expect(validateBooking({ ...good, checkOut: dateFromToday(9) }, 4)).toBe(msg);
  });

  it('checks the guest count against the listing', () => {
    const msg = 'Guests must be a whole number of 1 or more';
    expect(validateBooking({ ...good, guests: '0' }, 4)).toBe(msg);
    expect(validateBooking({ ...good, guests: '1.5' }, 4)).toBe(msg);
    expect(validateBooking({ ...good, guests: '' }, 4)).toBe(msg);
    expect(validateBooking({ ...good, guests: '5' }, 4)).toBe('This place takes at most 4 guests');
    expect(validateBooking({ ...good, guests: '4' }, 4)).toBeNull();
  });
});

describe('validateDestination', () => {
  const good = {
    city: 'Skardu',
    country: 'Pakistan',
    description: 'Lakes and cold desert.',
    places: '',
    estimatedBudget: '500',
    imageUrl: '',
  };

  it('passes a complete destination, budget 0 is fine', () => {
    expect(validateDestination(good)).toBeNull();
    expect(validateDestination({ ...good, estimatedBudget: '0' })).toBeNull();
  });

  it('needs a city, a description and a budget of 0 or more', () => {
    expect(validateDestination({ ...good, city: '' })).toBe('City is required');
    expect(validateDestination({ ...good, description: ' ' })).toBe('Description is required');
    expect(validateDestination({ ...good, estimatedBudget: '' })).toBe('Estimated budget is required');
    expect(validateDestination({ ...good, estimatedBudget: '-1' })).toBe('Estimated budget must be a number of 0 or more');
  });
});
