import { test, expect, login, hasHorizontalScroll, controlsOutsideWindow, MAYA, ADMIN } from './helpers';

// Phone sized window (iPhone 12/13/14 width). Pages must not scroll sideways and the
// navbar collapses into the menu button.

test.use({ viewport: { width: 390, height: 844 } });

const publicPages = ['/', '/destinations', '/stories', '/login', '/register'];
const memberPages = ['/dashboard', '/trips', '/trips/new', '/bookings', '/favourites', '/profile', '/stories/new'];
const adminPages = ['/admin/destinations', '/admin/destinations/new', '/admin/reports', '/admin/accommodations', '/admin/bookings'];

async function checkPages(page: import('@playwright/test').Page, paths: string[]) {
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator('main')).not.toBeEmpty();
    await expect(page.getByRole('status').filter({ hasText: /Loading|Checking/ })).toHaveCount(0);
    expect(await hasHorizontalScroll(page), `sideways scroll on ${path}`).toBe(false);
    expect(await controlsOutsideWindow(page), `buttons cut off on ${path}`).toEqual([]);
  }
}

test('navbar collapses into a menu on a phone', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await expect(toggle).toBeVisible();
  await expect(page.getByRole('link', { name: 'Destinations', exact: true })).toBeHidden();
  await toggle.click();
  await page.getByRole('link', { name: 'Destinations', exact: true }).click();
  await expect(page).toHaveURL(/\/destinations$/);
  // the menu closes after picking a link
  await expect(page.getByRole('link', { name: 'Stories', exact: true })).toBeHidden();
});

test('public pages fit a phone screen', async ({ page }) => {
  await checkPages(page, publicPages);
  await page.goto('/destinations');
  await page.locator('.card').first().getByRole('link', { name: 'View details' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await hasHorizontalScroll(page)).toBe(false);
});

test('member pages fit a phone screen', async ({ page }) => {
  await login(page, MAYA);
  await checkPages(page, memberPages);
  await page.goto('/trips');
  await page.locator('.list-group-item a.fw-semibold').first().click();
  await expect(page.getByText('Day 1')).toBeVisible();
  expect(await hasHorizontalScroll(page)).toBe(false);
});

test('admin pages fit a phone screen', async ({ page }) => {
  await login(page, ADMIN);
  await checkPages(page, adminPages);
});
