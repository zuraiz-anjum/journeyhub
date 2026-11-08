import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from '../api/client';
import ReviewSection from './ReviewSection';
import BookingForm from './BookingForm';
import type { Accommodation, Review } from '../types';
import { dateFromToday, member, ok, renderPage, serverError } from '../test/utils';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const mockedApi = vi.mocked(api, true);

describe('ReviewSection rating', () => {
  const savedReview: Review = {
    _id: 'r1',
    author: { _id: member._id, name: member.name },
    destination: 'd1',
    rating: 3,
    comment: 'Nice but busy.',
    hidden: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  function mockReviews(mine: Review | null) {
    mockedApi.get.mockImplementation(async (url: string) => {
      if (url.startsWith('/reviews/mine')) return ok({ review: mine });
      if (url.startsWith('/reviews')) return ok({ reviews: mine ? [mine] : [] });
      throw serverError(404, 'Not found');
    });
  }

  it('does not post a review without a star rating', async () => {
    const user = userEvent.setup();
    mockReviews(null);
    renderPage(<ReviewSection destinationId="d1" onChanged={vi.fn()} />, { user: member });
    await screen.findByText('No reviews yet');

    await user.type(screen.getByLabelText('Review comment'), 'Great place');
    await user.click(screen.getByRole('button', { name: 'Post review' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please pick a rating from 1 to 5 stars');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('posts the picked rating and tells the page to refresh the average', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    mockReviews(null);
    mockedApi.post.mockResolvedValueOnce(ok({ review: savedReview }));
    renderPage(<ReviewSection destinationId="d1" onChanged={onChanged} />, { user: member });
    await screen.findByText('No reviews yet');

    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(screen.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'true');
    await user.type(screen.getByLabelText('Review comment'), '  Great place ');
    await user.click(screen.getByRole('button', { name: 'Post review' }));

    expect(mockedApi.post).toHaveBeenCalledWith('/reviews', { destination: 'd1', rating: 4, comment: 'Great place' });
    expect(await screen.findByText('Thanks for your review!')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it('fills the form with the saved review and updates it', async () => {
    const user = userEvent.setup();
    mockReviews(savedReview);
    mockedApi.put.mockResolvedValueOnce(ok({ review: { ...savedReview, rating: 5 } }));
    renderPage(<ReviewSection destinationId="d1" onChanged={vi.fn()} />, { user: member });

    expect(await screen.findByRole('button', { name: 'Update review' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Review comment')).toHaveValue('Nice but busy.');

    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    await user.click(screen.getByRole('button', { name: 'Update review' }));
    expect(mockedApi.put).toHaveBeenCalledWith('/reviews/r1', { rating: 5, comment: 'Nice but busy.' });
    expect(await screen.findByText('Your review was updated')).toBeInTheDocument();
  });

  it('shows the server error, e.g. a second review for the same place', async () => {
    const user = userEvent.setup();
    mockReviews(null);
    mockedApi.post.mockRejectedValueOnce(serverError(409, 'You already reviewed this destination. Edit your review instead.'));
    renderPage(<ReviewSection destinationId="d1" onChanged={vi.fn()} />, { user: member });
    await screen.findByText('No reviews yet');
    await user.click(screen.getByRole('radio', { name: '2 stars' }));
    await user.click(screen.getByRole('button', { name: 'Post review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You already reviewed this destination');
  });

  it('visitors get a login link instead of the form', async () => {
    mockReviews(null);
    renderPage(<ReviewSection destinationId="d1" onChanged={vi.fn()} />);
    await screen.findByText('No reviews yet');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });
});

describe('BookingForm', () => {
  const listing: Accommodation = {
    _id: 'a1',
    destination: { _id: 'd1', city: 'Lisbon', country: 'Portugal' },
    name: 'Alfama Rooftop Guesthouse',
    type: 'guesthouse',
    pricePerNight: 70,
    maxGuests: 2,
    description: '',
    active: true,
  };

  function setup() {
    const onCancel = vi.fn();
    renderPage(<BookingForm accommodation={listing} onCancel={onCancel} />, { user: member });
    const form = {
      checkIn: screen.getByLabelText('Check-in'),
      checkOut: screen.getByLabelText('Check-out'),
      guests: screen.getByLabelText('Guests (max 2)'),
      send: screen.getByRole('button', { name: 'Send request' }),
    };
    return { form, onCancel };
  }

  const setDate = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });

  it('needs both dates', async () => {
    const user = userEvent.setup();
    const { form } = setup();
    await user.click(form.send);
    expect(screen.getByRole('alert')).toHaveTextContent('Please pick check-in and check-out dates');
    setDate(form.checkIn, dateFromToday(5));
    await user.click(form.send);
    expect(screen.getByRole('alert')).toHaveTextContent('Please pick check-in and check-out dates');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('rejects a past check-in and a check-out that is not after check-in', async () => {
    const user = userEvent.setup();
    const { form } = setup();
    setDate(form.checkIn, dateFromToday(-2));
    setDate(form.checkOut, dateFromToday(1));
    await user.click(form.send);
    expect(screen.getByRole('alert')).toHaveTextContent('Check-in date cannot be in the past');

    setDate(form.checkIn, dateFromToday(5));
    setDate(form.checkOut, dateFromToday(5));
    await user.click(form.send);
    expect(screen.getByRole('alert')).toHaveTextContent('Check-out must be at least one day after check-in');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('limits the check-out picker to dates from the check-in on', () => {
    const { form } = setup();
    expect(form.checkIn).toHaveAttribute('min', dateFromToday(0));
    setDate(form.checkIn, dateFromToday(5));
    expect(form.checkOut).toHaveAttribute('min', dateFromToday(5));
  });

  it('checks the guest count against the listing', async () => {
    const user = userEvent.setup();
    const { form } = setup();
    setDate(form.checkIn, dateFromToday(5));
    setDate(form.checkOut, dateFromToday(7));

    await user.clear(form.guests);
    await user.type(form.guests, '3');
    await user.click(form.send);
    expect(screen.getByRole('alert')).toHaveTextContent('This place takes at most 2 guests');

    await user.clear(form.guests);
    await user.type(form.guests, '0');
    await user.click(form.send);
    expect(screen.getByRole('alert')).toHaveTextContent('Guests must be a whole number of 1 or more');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('shows the number of nights and the estimate', () => {
    const { form } = setup();
    setDate(form.checkIn, dateFromToday(5));
    setDate(form.checkOut, dateFromToday(8));
    expect(screen.getByText(/3 nights, about \$210/)).toBeInTheDocument();
  });

  it('sends a valid request and shows the pending message', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValueOnce(ok({ booking: { _id: 'b1' } }));
    const { form } = setup();
    const checkIn = dateFromToday(5);
    const checkOut = dateFromToday(7);
    setDate(form.checkIn, checkIn);
    setDate(form.checkOut, checkOut);
    await user.clear(form.guests);
    await user.type(form.guests, '2');
    await user.type(screen.getByLabelText('Note'), ' Late arrival ');
    await user.click(form.send);

    expect(mockedApi.post).toHaveBeenCalledWith('/bookings', {
      accommodation: 'a1',
      checkIn,
      checkOut,
      guests: 2,
      note: 'Late arrival',
    });
    const success = await screen.findByText(/Request sent!/);
    expect(within(success).getByRole('link', { name: 'my bookings' })).toHaveAttribute('href', '/bookings');
  });

  it('the cancel button closes the form', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
