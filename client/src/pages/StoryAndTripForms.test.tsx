import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from '../api/client';
import StoryFormPage from './StoryFormPage';
import TripFormPage from './TripFormPage';
import { dateFromToday, member, ok, renderPage, serverError } from '../test/utils';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
const mockedApi = vi.mocked(api, true);

const destinations = [
  { _id: 'd1', city: 'Hunza', country: 'Pakistan' },
  { _id: 'd2', city: 'Kyoto', country: 'Japan' },
];

beforeEach(() => {
  mockedApi.get.mockImplementation(async (url: string) => {
    if (url === '/destinations') return ok({ destinations });
    throw serverError(404, 'Not found');
  });
});

// date inputs are set directly, typing into them is not supported by the test browser
function setDate(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('StoryFormPage', () => {
  async function setup() {
    renderPage(<StoryFormPage />, { route: '/stories/new', path: '/stories/new', user: member });
    // wait for the destination list
    await screen.findByRole('option', { name: 'Hunza, Pakistan' });
    return screen.getByRole('button', { name: 'Publish story' });
  }

  it('checks the required fields one by one', async () => {
    const user = userEvent.setup();
    const publish = await setup();
    const alertText = () => screen.getByRole('alert').textContent;

    await user.click(publish);
    expect(alertText()).toBe('Please choose a destination');

    await user.selectOptions(screen.getByLabelText('Destination'), 'd1');
    await user.click(publish);
    expect(alertText()).toBe('Please give your story a title');

    await user.type(screen.getByLabelText('Title'), 'Apricot season');
    await user.click(publish);
    expect(alertText()).toBe('Please enter the date you travelled');

    setDate('Travel date', dateFromToday(-20));
    await user.click(publish);
    expect(alertText()).toBe('Please write something about your trip');

    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('does not accept a travel date in the future', async () => {
    const user = userEvent.setup();
    const publish = await setup();
    await user.selectOptions(screen.getByLabelText('Destination'), 'd2');
    await user.type(screen.getByLabelText('Title'), 'Temples');
    setDate('Travel date', dateFromToday(3));
    await user.type(screen.getByLabelText('Your story'), 'Lots of temples.');
    await user.click(publish);
    expect(screen.getByRole('alert')).toHaveTextContent('Travel date cannot be in the future');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('posts a valid story and opens it', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValueOnce(ok({ story: { _id: 's9' } }));
    const publish = await setup();
    const date = dateFromToday(-20);
    await user.selectOptions(screen.getByLabelText('Destination'), 'd1');
    await user.type(screen.getByLabelText('Title'), '  Apricot season ');
    setDate('Travel date', date);
    await user.type(screen.getByLabelText('Your story'), 'Long drive, great views.');
    await user.click(publish);

    expect(mockedApi.post).toHaveBeenCalledWith('/stories', {
      destination: 'd1',
      title: 'Apricot season',
      travelDate: date,
      text: 'Long drive, great views.',
      imageUrl: '',
    });
    expect(await screen.findByTestId('location')).toHaveTextContent('/stories/s9');
  });

  it('shows the server message if saving fails', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValueOnce(serverError(400, 'Please pick a destination from the list'));
    const publish = await setup();
    await user.selectOptions(screen.getByLabelText('Destination'), 'd1');
    await user.type(screen.getByLabelText('Title'), 'Trip');
    setDate('Travel date', dateFromToday(-1));
    await user.type(screen.getByLabelText('Your story'), 'Text');
    await user.click(publish);
    expect(await screen.findByRole('alert')).toHaveTextContent('Please pick a destination from the list');
    expect(publish).toBeEnabled();
  });
});

describe('TripFormPage', () => {
  async function setup() {
    renderPage(<TripFormPage />, { route: '/trips/new', path: '/trips/new', user: member });
    await screen.findByLabelText('Hunza');
    return screen.getByRole('button', { name: 'Create trip' });
  }

  it('needs a title and both dates', async () => {
    const user = userEvent.setup();
    const create = await setup();
    await user.click(create);
    expect(screen.getByRole('alert')).toHaveTextContent('Please give the trip a title');

    await user.type(screen.getByLabelText('Title'), 'Summer');
    await user.click(create);
    expect(screen.getByRole('alert')).toHaveTextContent('Please pick a start and an end date');

    setDate('Start date', '2027-06-10');
    await user.click(create);
    expect(screen.getByRole('alert')).toHaveTextContent('Please pick a start and an end date');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('does not allow an end date before the start date', async () => {
    const user = userEvent.setup();
    const create = await setup();
    await user.type(screen.getByLabelText('Title'), 'Summer');
    setDate('Start date', '2027-06-10');
    setDate('End date', '2027-06-09');
    await user.click(create);
    expect(screen.getByRole('alert')).toHaveTextContent('End date cannot be before the start date');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('the end date picker starts at the start date', async () => {
    await setup();
    setDate('Start date', '2027-06-10');
    expect(screen.getByLabelText('End date')).toHaveAttribute('min', '2027-06-10');
  });

  it('does not allow trips longer than 60 days', async () => {
    const user = userEvent.setup();
    const create = await setup();
    await user.type(screen.getByLabelText('Title'), 'Long one');
    setDate('Start date', '2027-01-01');
    setDate('End date', '2027-03-15');
    await user.click(create);
    expect(screen.getByRole('alert')).toHaveTextContent('Trips can be at most 60 days long');
  });

  it('creates the trip with the ticked destinations', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValueOnce(ok({ trip: { _id: 't5' } }));
    const create = await setup();
    await user.type(screen.getByLabelText('Title'), ' Summer ');
    setDate('Start date', '2027-06-10');
    setDate('End date', '2027-06-12');
    await user.click(screen.getByLabelText('Kyoto'));
    await user.click(screen.getByLabelText('Hunza'));
    await user.click(screen.getByLabelText('Kyoto')); // untick again
    await user.click(create);

    expect(mockedApi.post).toHaveBeenCalledWith('/trips', {
      title: 'Summer',
      startDate: '2027-06-10',
      endDate: '2027-06-12',
      destinations: ['d1'],
      notes: '',
    });
    expect(await screen.findByTestId('location')).toHaveTextContent('/trips/t5');
  });
});
