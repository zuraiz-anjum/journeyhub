import { test, expect, login, openDestination, acceptNextDialog, dateFromToday, MAYA, OMAR } from './helpers';

// Member features, mostly as Maya. Omar is used where a second member is needed.

test.describe.configure({ mode: 'serial' });

test('review create, edit and delete with rating check', async ({ page }) => {
  await login(page, MAYA);
  await openDestination(page, 'Lisbon');
  await expect(page.getByText('4.0 (1 review)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rate this destination' })).toBeVisible();

  // no stars picked
  await page.getByLabel('Review comment').fill('Loved the trams.');
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByRole('alert')).toHaveText('Please pick a rating from 1 to 5 stars');

  await page.getByRole('radio', { name: '2 stars' }).click();
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByText('Thanks for your review!')).toBeVisible();
  await expect(page.getByText('3.0 (2 reviews)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your review' })).toBeVisible();
  const mine = page.locator('li').filter({ hasText: 'you' });
  await expect(mine).toContainText('Loved the trams.');

  // edit: the form is filled with the saved review
  await expect(page.getByRole('radio', { name: '2 stars' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radio', { name: '4 stars' }).click();
  await page.getByLabel('Review comment').fill('Loved the trams and the custard tarts.');
  await page.getByRole('button', { name: 'Update review' }).click();
  await expect(page.getByText('Your review was updated')).toBeVisible();
  await expect(page.getByText('4.0 (2 reviews)')).toBeVisible();
  await expect(mine).toContainText('custard tarts');

  await page.reload();
  await expect(page.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'true');

  acceptNextDialog(page);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Your review was deleted')).toBeVisible();
  await expect(page.getByText('4.0 (1 review)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rate this destination' })).toBeVisible();
  await expect(page.getByRole('radio', { name: '4 stars' })).toHaveAttribute('aria-checked', 'false');

  // and post it again for the dashboard count later
  await page.getByRole('radio', { name: '5 stars' }).click();
  await page.getByRole('button', { name: 'Post review' }).click();
  await expect(page.getByText('Thanks for your review!')).toBeVisible();
});

test('favourite toggle and saved places', async ({ page }) => {
  await login(page, MAYA);
  await openDestination(page, 'Cape Town');
  const save = page.getByRole('button', { name: '♡ Save to favourites' });
  await save.click();
  await expect(page.getByRole('button', { name: '♥ Saved' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '♥ Saved' })).toBeVisible();

  await page.getByRole('link', { name: 'Saved', exact: true }).click();
  await expect(page.locator('.card h2')).toHaveCount(3);
  await expect(page.locator('.card h2')).toContainText(['Cape Town', 'Hunza', 'Kyoto']);

  await openDestination(page, 'Cape Town');
  await page.getByRole('button', { name: '♥ Saved' }).click();
  await expect(page.getByRole('button', { name: '♡ Save to favourites' })).toBeVisible();
  await page.getByRole('link', { name: 'Saved', exact: true }).click();
  await expect(page.locator('.card h2')).toHaveCount(2);
});

test('story create, edit and delete', async ({ page }) => {
  await login(page, MAYA);
  await page.goto('/stories');
  await page.getByRole('link', { name: 'Write a story' }).click();
  await expect(page.getByRole('heading', { name: 'Share a travel story' })).toBeVisible();

  const publish = page.getByRole('button', { name: 'Publish story' });
  const alert = page.getByRole('alert');
  await publish.click();
  await expect(alert).toHaveText('Please choose a destination');

  await page.getByLabel('Destination').selectOption({ label: 'Reykjavik, Iceland' });
  await publish.click();
  await expect(alert).toHaveText('Please give your story a title');

  await page.getByLabel('Title').fill('Blue Lagoon in the snow');
  await publish.click();
  await expect(alert).toHaveText('Please enter the date you travelled');

  await page.getByLabel('Travel date').fill(dateFromToday(5));
  await publish.click();
  await expect(alert).toHaveText('Travel date cannot be in the future');

  await page.getByLabel('Travel date').fill(dateFromToday(-10));
  await publish.click();
  await expect(alert).toHaveText('Please write something about your trip');

  await page.getByLabel('Your story').fill('Snow, hot water and a very cold walk back to the bus.\n\nWorth it.');
  await page.getByLabel('Image URL (optional)').fill('ftp://example.com/a.jpg');
  await publish.click();
  await expect(alert).toHaveText('Image URL must start with http:// or https://');

  await page.getByLabel('Image URL (optional)').fill('');
  await publish.click();
  await expect(page.getByRole('heading', { name: 'Blue Lagoon in the snow' })).toBeVisible();
  await expect(page.getByText('by Maya Rahman')).toBeVisible();
  // owners do not get a report button on their own story
  await expect(page.getByRole('button', { name: 'Report' })).toHaveCount(0);

  // shows up first in the feed
  await page.goto('/stories');
  await expect(page.getByText('9 stories found')).toBeVisible();
  await expect(page.locator('.card h2').first()).toHaveText('Blue Lagoon in the snow');

  // edit
  await page.locator('.card').filter({ hasText: 'Blue Lagoon in the snow' }).getByRole('link', { name: 'Read story' }).click();
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit story' })).toBeVisible();
  await expect(page.getByLabel('Title')).toHaveValue('Blue Lagoon in the snow');
  await expect(page.getByLabel('Destination')).toHaveValue(/.+/);
  await page.getByLabel('Title').fill('Sky Lagoon in the snow');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Sky Lagoon in the snow' })).toBeVisible();

  // delete
  acceptNextDialog(page);
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Story deleted')).toBeVisible();
  await page.goto('/stories');
  await expect(page.getByText('8 stories found')).toBeVisible();
});

test("a member cannot edit another member's story", async ({ page }) => {
  await login(page, OMAR);
  await page.goto('/stories?q=Galata');
  await page.getByRole('link', { name: 'Read story' }).click();
  await expect(page.getByRole('heading', { name: 'Sunset from Galata' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit' })).toHaveCount(0);
  const url = page.url();
  await page.goto(url + '/edit');
  await expect(page.getByText('You can only edit your own stories.')).toBeVisible();
});

test('report a story and a review', async ({ page }) => {
  await login(page, OMAR);
  // Maya's story
  await page.goto('/stories?q=Table%20Mountain');
  await page.getByRole('link', { name: 'Read story' }).click();
  await page.getByRole('button', { name: 'Report' }).click();
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('Please explain the problem in a few words')).toBeVisible();
  await page.getByLabel('Why are you reporting this story?').fill('This is an advert for a tour company.');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('Thanks, the admin will review this.')).toBeVisible();

  // reporting the same story twice is refused by the server
  await page.reload();
  await page.getByRole('button', { name: 'Report' }).click();
  await page.getByLabel('Why are you reporting this story?').fill('Still an advert.');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('You already reported this')).toBeVisible();

  // Maya's review of Kyoto
  await openDestination(page, 'Kyoto');
  const review = page.locator('li').filter({ hasText: 'Maya Rahman' });
  await review.getByRole('button', { name: 'Report' }).click();
  await review.getByLabel('Why are you reporting this review?').fill('Rude words in the comment.');
  await review.getByRole('button', { name: 'Send report' }).click();
  await expect(review.getByText('Thanks, the admin will review this.')).toBeVisible();
});

test('trip plan create with destinations and day activities, edit, delete', async ({ page }) => {
  await login(page, MAYA);
  await page.getByRole('link', { name: 'My Trips', exact: true }).click();
  await expect(page.getByText('Spring in Lisbon')).toBeVisible();
  await page.getByRole('link', { name: 'New trip' }).click();

  const create = page.getByRole('button', { name: 'Create trip' });
  const alert = page.getByRole('alert');
  await create.click();
  await expect(alert).toHaveText('Please give the trip a title');

  await page.getByLabel('Title').fill('Northern Pakistan loop');
  await create.click();
  await expect(alert).toHaveText('Please pick a start and an end date');

  await page.getByLabel('Start date').fill(dateFromToday(30));
  await page.getByLabel('End date').fill(dateFromToday(27));
  await create.click();
  await expect(alert).toHaveText('End date cannot be before the start date');

  await page.getByLabel('End date').fill(dateFromToday(120));
  await create.click();
  await expect(alert).toHaveText('Trips can be at most 60 days long');

  await page.getByLabel('End date').fill(dateFromToday(32));
  await page.getByLabel('Hunza').check();
  await page.getByLabel('Istanbul').check();
  await page.getByLabel('Notes (optional)').fill('Fly back through Istanbul.');
  await create.click();

  await expect(page.getByRole('heading', { name: 'Northern Pakistan loop' })).toBeVisible();
  await expect(page.getByText('3 days', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Hunza' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Istanbul' })).toBeVisible();
  await expect(page.getByText('Nothing planned yet.')).toHaveCount(3);

  // day by day activities
  await expect(page.getByRole('button', { name: 'Save plan' })).toBeDisabled();
  await page.getByLabel('Add activity for day 1').fill('Drive to Karimabad');
  await page.getByLabel('Add activity for day 1').press('Enter');
  await page.getByLabel('Add activity for day 1').fill('Baltit Fort');
  await page.getByRole('button', { name: 'Add' }).first().click();
  await page.getByLabel('Add activity for day 3').fill('Fly to Istanbul');
  await page.getByLabel('Add activity for day 3').press('Enter');
  await expect(page.getByText('You have unsaved changes')).toBeVisible();
  await page.getByRole('button', { name: 'Remove Baltit Fort' }).click();
  await page.getByRole('button', { name: 'Save plan' }).click();
  await expect(page.getByText('Plan saved')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Drive to Karimabad')).toBeVisible();
  await expect(page.getByText('Fly to Istanbul')).toBeVisible();
  await expect(page.getByText('Baltit Fort')).toHaveCount(0);

  // edit details: shorten the trip to two days, the day 3 activity goes away
  await page.getByRole('link', { name: 'Edit trip details' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Northern Pakistan loop');
  await expect(page.getByLabel('Hunza')).toBeChecked();
  await page.getByLabel('Title').fill('Hunza long weekend');
  await page.getByLabel('End date').fill(dateFromToday(31));
  await page.getByLabel('Istanbul').uncheck();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Hunza long weekend' })).toBeVisible();
  await expect(page.getByText('2 days', { exact: false })).toBeVisible();
  await expect(page.getByText('Drive to Karimabad')).toBeVisible();
  await expect(page.getByText('Fly to Istanbul')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Istanbul' })).toHaveCount(0);

  // list and delete
  await page.getByRole('link', { name: '← My trips' }).click();
  const row = page.locator('.list-group-item').filter({ hasText: 'Hunza long weekend' });
  await expect(row).toContainText('Hunza');
  acceptNextDialog(page);
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.list-group-item').filter({ hasText: 'Hunza long weekend' })).toHaveCount(0);
  await expect(page.getByText('Spring in Lisbon')).toBeVisible();
});

test("a member cannot open another member's trip", async ({ page }) => {
  await login(page, MAYA);
  await page.goto('/trips');
  await page.getByRole('link', { name: 'Spring in Lisbon' }).click();
  const tripUrl = page.url();
  await page.getByRole('button', { name: 'Log out' }).click();

  await login(page, OMAR);
  await page.goto(tripUrl);
  await expect(page.getByRole('alert')).toContainText('This trip plan is private');
});

test('accommodation booking request and cancel', async ({ page }) => {
  await login(page, MAYA);
  await openDestination(page, 'Kyoto');
  const listing = page.locator('.card').filter({ hasText: 'Gion Machiya House' });
  await listing.getByRole('button', { name: 'Request to book' }).click();

  const send = listing.getByRole('button', { name: 'Send request' });
  const alert = listing.getByRole('alert');
  await send.click();
  await expect(alert).toHaveText('Please pick check-in and check-out dates');

  await listing.getByLabel('Check-in').fill(dateFromToday(-3));
  await listing.getByLabel('Check-out').fill(dateFromToday(2));
  await send.click();
  await expect(alert).toHaveText('Check-in date cannot be in the past');

  await listing.getByLabel('Check-in').fill(dateFromToday(10));
  await listing.getByLabel('Check-out').fill(dateFromToday(10));
  await send.click();
  await expect(alert).toHaveText('Check-out must be at least one day after check-in');

  await listing.getByLabel('Check-out').fill(dateFromToday(13));
  await listing.getByLabel(/Guests/).fill('6');
  await send.click();
  await expect(alert).toHaveText('This place takes at most 4 guests');

  await listing.getByLabel(/Guests/).fill('0');
  await send.click();
  await expect(alert).toHaveText('Guests must be a whole number of 1 or more');

  await listing.getByLabel(/Guests/).fill('3');
  await expect(listing.getByText('3 nights, about $420')).toBeVisible();
  await listing.getByLabel('Note').fill('Arriving by train in the evening.');
  await send.click();
  await expect(listing.getByText(/Request sent!/)).toBeVisible();

  await listing.getByRole('link', { name: 'my bookings' }).click();
  await expect(page.getByRole('heading', { name: 'My booking requests' })).toBeVisible();
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  const kyoto = rows.filter({ hasText: 'Gion Machiya House' });
  await expect(kyoto).toContainText('Pending');
  await expect(kyoto).toContainText('$420');

  acceptNextDialog(page);
  await kyoto.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Request cancelled')).toBeVisible();
  await expect(kyoto).toContainText('Cancelled');
  await expect(kyoto.getByRole('button', { name: 'Cancel' })).toHaveCount(0);

  // make one more request that stays Pending for the admin tests
  await openDestination(page, 'Istanbul');
  const hotel = page.locator('.card').filter({ hasText: 'Sultanahmet Courtyard Hotel' });
  await hotel.getByRole('button', { name: 'Request to book' }).click();
  await hotel.getByLabel('Check-in').fill(dateFromToday(50));
  await hotel.getByLabel('Check-out').fill(dateFromToday(52));
  await hotel.getByLabel(/Guests/).fill('2');
  await hotel.getByRole('button', { name: 'Send request' }).click();
  await expect(hotel.getByText(/Request sent!/)).toBeVisible();
});

test('member dashboard counts', async ({ page }) => {
  await login(page, MAYA);
  await expect(page).toHaveURL(/\/dashboard$/);
  const card = (label: string) => page.locator('a.card').filter({ hasText: label }).locator('.display-6');
  // seed: 4 stories, 2 saved, 1 trip, 3 reviews + Lisbon, 1 pending + Istanbul request
  await expect(card('Stories')).toHaveText('4');
  await expect(card('Saved places')).toHaveText('2');
  await expect(card('Trip plans')).toHaveText('1');
  await expect(card('Reviews')).toHaveText('4');
  await expect(card('Pending bookings')).toHaveText('2');
  await expect(page.locator('.list-group-item')).toHaveCount(4);

  // the stories count opens the member's own stories
  await page.locator('a.card').filter({ hasText: 'Stories' }).click();
  await expect(page.locator('.card h2')).toHaveCount(4);
  await expect(page.getByText('4 stories found')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My stories' })).toBeVisible();
  // searching stays inside the member's own stories
  await page.getByLabel('Search stories').fill('Lisbon');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/mine=true/);
  await expect(page.getByText('No stories found')).toBeVisible();
  await page.getByLabel('Search stories').fill('Galata');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('.card h2')).toHaveText(['Sunset from Galata']);
  await page.getByRole('link', { name: 'Show stories from everyone' }).click();
  await expect(page.getByText('8 stories found')).toBeVisible();
});

test('a member typing an admin url is blocked', async ({ page }) => {
  await login(page, OMAR);
  for (const path of ['/admin/destinations', '/admin/destinations/new', '/admin/reports', '/admin/accommodations', '/admin/bookings']) {
    await page.goto(path);
    await expect(page.getByText('This page is only for the admin.')).toBeVisible();
    await expect(page.locator('table')).toHaveCount(0);
  }
  await expect(page.getByRole('link', { name: 'Manage Destinations' })).toHaveCount(0);
});
