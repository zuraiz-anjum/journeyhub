import { test, expect, login, logout, acceptNextDialog, openDestination, ADMIN, MAYA, OMAR } from './helpers';

// Admin pages. Runs after 03-member, which leaves two open reports (a story and a review)
// and a Pending booking from Maya for the Istanbul hotel.

test.describe.configure({ mode: 'serial' });

test('admin lands on the destinations page and cannot open member pages', async ({ page }) => {
  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/admin\/destinations$/);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0);
  for (const path of ['/dashboard', '/trips', '/bookings', '/stories/new']) {
    await page.goto(path);
    await expect(page.getByText('This page is only for members.')).toBeVisible();
  }
  // no review form or favourite button for the admin
  await openDestination(page, 'Kyoto');
  await expect(page.getByRole('heading', { name: 'Rate this destination' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Save to favourites/ })).toHaveCount(0);
});

test('admin adds, edits, archives and restores a destination', async ({ page }) => {
  await login(page, ADMIN);
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(7);
  await expect(rows.filter({ hasText: 'Marrakesh' })).toContainText('Archived');

  await page.getByRole('link', { name: 'Add destination' }).click();
  const add = page.getByRole('button', { name: 'Add destination' });
  const alert = page.getByRole('alert');
  await add.click();
  await expect(alert).toHaveText('City is required');
  await page.getByLabel('City').fill('Skardu');
  await page.getByLabel('Country').fill('Pakistan');
  await add.click();
  await expect(alert).toHaveText('Description is required');
  await page.getByLabel('Description').fill('Gateway to the Karakoram with cold deserts and blue lakes.');
  await add.click();
  await expect(alert).toHaveText('Estimated budget is required');
  await page.getByLabel('Estimated budget ($)').fill('-5');
  await add.click();
  await expect(alert).toHaveText('Estimated budget must be a number of 0 or more');
  await page.getByLabel('Estimated budget ($)').fill('550');
  await page.getByLabel('Image URL').fill('not a url');
  await add.click();
  await expect(alert).toHaveText('Image URL must start with http:// or https://');
  await page.getByLabel('Image URL').fill('https://placehold.co/800x500/0d6efd/white?text=Skardu');
  await page.getByLabel('Places to visit (one per line)').fill('Shangrila Lake\n\nDeosai Plains\n  Cold Desert  ');
  await add.click();

  await expect(page).toHaveURL(/\/admin\/destinations$/);
  await expect(rows).toHaveCount(8);
  const skardu = rows.filter({ hasText: 'Skardu' });
  await expect(skardu).toContainText('$550');
  await expect(skardu).toContainText('Live');

  // edit
  await skardu.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByLabel('City')).toHaveValue('Skardu');
  await expect(page.getByLabel('Places to visit (one per line)')).toHaveValue('Shangrila Lake\nDeosai Plains\nCold Desert');
  await page.getByLabel('Estimated budget ($)').fill('600');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(skardu).toContainText('$600');

  // visitors see it, with the places list
  await skardu.getByRole('link', { name: 'Skardu' }).click();
  await expect(page.getByText('Deosai Plains')).toBeVisible();

  // archive hides it from the public list, restore brings it back
  await page.goto('/admin/destinations');
  await skardu.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Skardu was archived')).toBeVisible();
  await expect(skardu).toContainText('Archived');
  await page.goto('/destinations?city=Skardu');
  await expect(page.getByText('No destinations match your search')).toBeVisible();

  await page.goto('/admin/destinations');
  await skardu.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('Skardu was restored')).toBeVisible();
  await page.goto('/destinations?city=Skardu');
  await expect(page.locator('.card h2')).toHaveText(['Skardu']);
});

test('admin hides a reported story and dismisses a reported review', async ({ page }) => {
  await login(page, ADMIN);
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  const cards = page.locator('.card');
  // seeded report + the two from the member tests
  await expect(cards).toHaveCount(3);

  const story = cards.filter({ hasText: 'This is an advert for a tour company.' });
  await expect(story).toContainText('Hiking up Table Mountain');
  await expect(story).toContainText('reported by Omar Siddiqui');
  acceptNextDialog(page);
  await story.getByRole('button', { name: 'Hide content' }).click();
  await expect(page.getByText('The story is now hidden')).toBeVisible();
  await expect(cards).toHaveCount(2);

  const review = cards.filter({ hasText: 'Rude words in the comment.' });
  await expect(review).toContainText('Rating: 5 / 5');
  await review.getByRole('button', { name: 'Dismiss report' }).click();
  await expect(page.getByText('Report dismissed')).toBeVisible();
  await expect(cards).toHaveCount(1);

  await page.getByRole('button', { name: 'Content hidden' }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Hiking up Table Mountain');
  await expect(cards.getByRole('button', { name: 'Hide content' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Dismissed' }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole('button', { name: 'All' }).click();
  await expect(cards).toHaveCount(3);

  // hide the seeded review report too, then the open list is empty
  await page.getByRole('button', { name: 'Open' }).click();
  acceptNextDialog(page);
  await cards.getByRole('button', { name: 'Hide content' }).click();
  await expect(page.getByText('No reports here')).toBeVisible();
});

test('hidden content disappears for others but the owner still sees it', async ({ page }) => {
  await page.goto('/stories?q=Table%20Mountain');
  await expect(page.getByText('No stories found')).toBeVisible();

  await login(page, MAYA);
  await expect(page.locator('.list-group-item').filter({ hasText: 'Hiking up Table Mountain' })).toContainText('hidden');
  await page.getByRole('link', { name: 'Hiking up Table Mountain' }).click();
  await expect(page.getByText('This story was hidden by the admin after a report.')).toBeVisible();
});

test('admin manages accommodation listings', async ({ page }) => {
  await login(page, ADMIN);
  await page.getByRole('link', { name: 'Accommodations', exact: true }).click();
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(6);

  const add = page.getByRole('button', { name: 'Add listing' });
  const alert = page.getByRole('alert');
  await add.click();
  await expect(alert).toHaveText('Please choose a destination');
  await page.getByLabel('Destination').selectOption({ label: 'Reykjavik' });
  await add.click();
  await expect(alert).toHaveText('Name is required');
  await page.getByLabel('Name').fill('Harbour Hostel');
  await page.getByLabel('Type').selectOption('hostel');
  await add.click();
  await expect(alert).toHaveText('Price per night must be 0 or more');
  await page.getByLabel('Price / night ($)').fill('40');
  await page.getByLabel('Max guests').fill('0');
  await add.click();
  await expect(alert).toHaveText('Max guests must be a whole number of 1 or more');
  await page.getByLabel('Max guests').fill('2');
  await page.getByLabel('Description').fill('Bunk beds next to the old harbour.');
  await add.click();
  await expect(page.getByText('Listing added')).toBeVisible();
  await expect(rows).toHaveCount(7);

  const hostel = rows.filter({ hasText: 'Harbour Hostel' });
  await hostel.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit listing' })).toBeVisible();
  await expect(page.getByLabel('Name')).toHaveValue('Harbour Hostel');
  await page.getByLabel('Price / night ($)').fill('45');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Listing updated')).toBeVisible();
  await expect(hostel).toContainText('$45');

  // members can see it on the destination page
  await openDestination(page, 'Reykjavik');
  await expect(page.getByText('Harbour Hostel')).toBeVisible();

  // inactive listings are hidden from the destination page
  await page.goto('/admin/accommodations');
  await hostel.getByRole('button', { name: 'Deactivate' }).click();
  await expect(hostel).toContainText('Inactive');
  await openDestination(page, 'Reykjavik');
  await expect(page.getByText('No places to stay listed yet')).toBeVisible();

  // a listing with booking requests cannot be deleted
  await page.goto('/admin/accommodations');
  acceptNextDialog(page);
  await rows.filter({ hasText: 'Alfama Rooftop Guesthouse' }).getByRole('button', { name: 'Delete' }).click();
  await expect(alert).toContainText('This listing has booking requests');

  acceptNextDialog(page);
  await hostel.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Listing deleted')).toBeVisible();
  await expect(rows).toHaveCount(6);
});

test('admin confirms and rejects booking requests', async ({ page }) => {
  await login(page, ADMIN);
  await page.getByRole('link', { name: 'Booking Requests' }).click();
  const rows = page.locator('tbody tr');
  // two seeded Pending requests + Maya's Istanbul request from the member tests
  await expect(rows).toHaveCount(3);

  const istanbul = rows.filter({ hasText: 'Sultanahmet Courtyard Hotel' });
  await expect(istanbul).toContainText('Maya Rahman');
  await istanbul.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Request from Maya Rahman confirmed')).toBeVisible();
  await expect(rows).toHaveCount(2);

  const kyoto = rows.filter({ hasText: 'Gion Machiya House' });
  await kyoto.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Request from Omar Siddiqui rejected')).toBeVisible();
  await expect(rows).toHaveCount(1);

  await page.getByRole('button', { name: 'Confirmed', exact: true }).click();
  await expect(rows).toHaveCount(2);
  await page.getByRole('button', { name: 'Rejected', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await page.getByRole('button', { name: 'Cancelled', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(rows).toHaveCount(5);
  await logout(page);

  // members see the new status in their history
  await login(page, MAYA);
  await page.getByRole('link', { name: 'Bookings', exact: true }).click();
  await expect(page.locator('tbody tr').filter({ hasText: 'Sultanahmet Courtyard Hotel' })).toContainText('Confirmed');
  await logout(page);
  await login(page, OMAR);
  await page.getByRole('link', { name: 'Bookings', exact: true }).click();
  await expect(page.locator('tbody tr').filter({ hasText: 'Gion Machiya House' })).toContainText('Rejected');
});

test('members can still edit a trip and a story after the admin archives the destination', async ({ page }) => {
  await login(page, ADMIN);
  await page.locator('tbody tr').filter({ hasText: 'Lisbon' }).getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Lisbon was archived')).toBeVisible();
  await logout(page);

  await login(page, MAYA);
  await page.goto('/trips');
  await page.getByRole('link', { name: 'Spring in Lisbon' }).click();
  await page.getByRole('link', { name: 'Edit trip details' }).click();
  await page.getByLabel('Title').fill('Spring in Portugal');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Spring in Portugal' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lisbon' })).toBeVisible();
  await logout(page);

  // Omar's Lisbon story keeps its destination in the edit form
  await login(page, OMAR);
  await page.goto('/stories?q=student%20budget');
  await page.getByRole('link', { name: 'Read story' }).click();
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByLabel('Destination').locator('option:checked')).toContainText('Lisbon');
  await page.getByLabel('Title').fill('Lisbon on a tight student budget');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Lisbon on a tight student budget' })).toBeVisible();
  await logout(page);

  await login(page, ADMIN);
  await page.locator('tbody tr').filter({ hasText: 'Lisbon' }).getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('Lisbon was restored')).toBeVisible();
});
