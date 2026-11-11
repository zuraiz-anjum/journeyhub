import { test, expect, openDestination } from './helpers';

// Everything a visitor can do without an account.

test('home page links to destinations and stories', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Plan trips and share your travels' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join JourneyHub' })).toBeVisible();
  await page.getByRole('link', { name: 'Browse destinations' }).click();
  await expect(page).toHaveURL(/\/destinations$/);
  // archived Marrakesh is not shown to visitors
  await expect(page.locator('.card h2')).toHaveCount(6);
  await expect(page.getByRole('heading', { name: 'Marrakesh' })).toHaveCount(0);
});

test('destination list shows a loading state, then an error with retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/destinations', async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    if (fail) await route.fulfill({ status: 500, json: { message: 'Database is down' } });
    else await route.continue();
  });
  await page.goto('/destinations');
  await expect(page.getByText('Loading destinations...')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Database is down');
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.card h2')).toHaveCount(6);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('destination filters by city and budget', async ({ page }) => {
  await page.goto('/destinations');
  const titles = page.locator('.card h2');

  await page.getByLabel('City or country').fill('lisbon');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/city=lisbon/);
  await expect(titles).toHaveText(['Lisbon']);

  // country names match too
  await page.getByLabel('City or country').fill('Pakistan');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(titles).toHaveText(['Hunza']);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(titles).toHaveCount(6);
  await expect(page.getByLabel('City or country')).toHaveValue('');

  await page.getByLabel('Max budget ($)').fill('800');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(titles).toHaveCount(2);
  await expect(titles).toContainText(['Hunza', 'Istanbul']);

  await page.getByLabel('Min budget ($)').fill('1000');
  await page.getByLabel('Max budget ($)').fill('2000');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(titles).toHaveCount(2);
  await expect(titles).toContainText(['Cape Town', 'Kyoto']);

  // min above max is caught before searching
  await page.getByLabel('Min budget ($)').fill('3000');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('alert')).toContainText('Minimum budget cannot be more than the maximum');

  // empty result
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.getByLabel('City or country').fill('Atlantis');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('No destinations match your search')).toBeVisible();

  // the filters come back with the back button
  await page.goBack();
  await expect(titles).toHaveCount(6);
  await expect(page.getByLabel('City or country')).toHaveValue('');
  await page.goForward();
  await expect(page.getByLabel('City or country')).toHaveValue('Atlantis');
});

test('destination details for a visitor', async ({ page }) => {
  await openDestination(page, 'Hunza');
  await expect(page.getByText('Pakistan', { exact: true })).toBeVisible();
  await expect(page.getByText('Baltit Fort')).toBeVisible();
  await expect(page.getByText('4.5 (2 reviews)')).toBeVisible();
  await expect(page.getByText('Karimabad View Hotel')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in to book' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in', exact: true }).last()).toBeVisible();
  await expect(page.getByRole('button', { name: /Save to favourites/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Report' })).toHaveCount(0);

  // a destination with no reviews and no listings shows the empty states
  await openDestination(page, 'Reykjavik');
  await expect(page.getByText('No ratings yet')).toBeVisible();
  await expect(page.getByText('No reviews yet')).toBeVisible();
  await expect(page.getByText('No places to stay listed yet')).toBeVisible();
});

test('unknown destination and unknown page', async ({ page }) => {
  await page.goto('/destinations/000000000000000000000000');
  await expect(page.getByRole('alert')).toContainText('not found');
  await page.goto('/destinations/not-an-id');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('story feed search and pagination', async ({ page }) => {
  await page.goto('/stories');
  const cards = page.locator('.card h2');
  await expect(page.getByText('8 stories found')).toBeVisible();
  await expect(cards).toHaveCount(6);
  await expect(page.getByRole('link', { name: 'Write a story' })).toHaveCount(0);

  await page.getByRole('button', { name: '2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(cards).toHaveCount(2);
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(cards).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();

  await page.getByLabel('Search stories').fill('galata');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(cards).toHaveText(['Sunset from Galata']);
  await expect(page.getByText('1 story found')).toBeVisible();

  // search also looks in the story text
  await page.getByLabel('Search stories').fill('apricot cake');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(cards).toHaveText(['Apricot season in Hunza']);

  await page.getByLabel('Search stories').fill('');
  await page.getByLabel('Filter by destination').selectOption({ label: 'Kyoto' });
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(cards).toHaveCount(2);

  await page.getByLabel('Search stories').fill('zzzz nothing');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('No stories found')).toBeVisible();

  // the navbar link starts a fresh search with empty boxes
  await page.getByRole('link', { name: 'Stories', exact: true }).click();
  await expect(page.getByText('8 stories found')).toBeVisible();
  await expect(page.getByLabel('Search stories')).toHaveValue('');
  await expect(page.getByLabel('Filter by destination')).toHaveValue('');

  // opening a story
  await page.goto('/stories?page=2');
  await page.locator('.card').filter({ hasText: 'Apricot season in Hunza' }).getByRole('link', { name: 'Read story' }).click();
  await expect(page.getByRole('heading', { name: 'Apricot season in Hunza' })).toBeVisible();
  await expect(page.getByText('by Maya Rahman')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Report' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});

test('stories link on a destination page filters the feed', async ({ page }) => {
  await openDestination(page, 'Istanbul');
  await page.getByRole('link', { name: /Read travel stories about Istanbul/ }).click();
  await expect(page.locator('.card h2')).toHaveCount(2);
  await expect(page.getByLabel('Filter by destination')).toHaveValue(/.+/);
  await expect(page.getByLabel('Filter by destination').locator('option:checked')).toHaveText('Istanbul');
});

test('member and admin pages send a visitor to the login page', async ({ page }) => {
  for (const path of ['/dashboard', '/trips/new', '/bookings', '/stories/new', '/profile', '/admin/reports']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  }
});
