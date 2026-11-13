import { test as base, expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@journeyhub.test', password: 'Admin123!', name: 'Site Admin' };
export const MAYA = { email: 'maya@journeyhub.test', password: 'Member123!', name: 'Maya Rahman' };
export const OMAR = { email: 'omar@journeyhub.test', password: 'Member123!', name: 'Omar Siddiqui' };

// Same test function as Playwright's, but every test fails if the page throws
// an uncaught error or React logs an error to the console.
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        // failed requests (401 on /auth/me, 404 on a bad id...) are expected, real errors are not
        if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
          errors.push(msg.text());
        }
      });
      await use(errors);
      expect(errors, 'errors in the browser console').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
}

// YYYY-MM-DD for today plus some days, in the same format the date inputs use
export function dateFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function openDestination(page: Page, city: string) {
  await page.goto('/destinations');
  const card = page.locator('.card').filter({ has: page.getByRole('heading', { name: city, exact: true }) });
  await card.getByRole('link', { name: 'View details' }).click();
  await expect(page.getByRole('heading', { level: 1, name: city })).toBeVisible();
}

// accept the next window.confirm() dialog
export function acceptNextDialog(page: Page) {
  page.once('dialog', (dialog) => dialog.accept());
}

// true when the page is wider than the window (sideways scrolling on a phone)
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

// buttons and links in the page content that stick out past the right edge of the window
// (for example an action button in a wide table that only shows after scrolling sideways)
export async function controlsOutsideWindow(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('main button, main a')]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.right > window.innerWidth + 1;
      })
      .map((el) => (el.textContent ?? '').trim())
  );
}
