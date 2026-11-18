// Saves the README screenshots to docs/screenshots.
// Needs MongoDB, the API (port 5000) and the Vite dev server (port 5173) running.
// It reseeds the database first so the pictures always show the demo data.
// Run from the client folder: npm run screenshots
//
// `npm run screenshots -- --all <folder>` instead saves every main screen as a visitor, a member
// and the admin, at desktop (1280x800) and phone (390x844) size, into <folder>, and lists any
// browser console errors and failed requests it saw. Useful for checking the layout by eye.
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const allIndex = process.argv.indexOf('--all');
const allMode = allIndex !== -1;
const outDir = allMode
  ? resolve(process.argv[allIndex + 1] || 'screenshots') + '/'
  : fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
const serverDir = fileURLToPath(new URL('../../server', import.meta.url));

execSync('npm run seed', { cwd: serverDir, stdio: 'inherit' });
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });

// YYYY-MM-DD for today plus some days
function dateFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const problems = [];

async function newPage(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (err) => problems.push(`page error on ${page.url()}: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      problems.push(`console error on ${page.url()}: ${msg.text()}`);
    }
  });
  page.on('response', (res) => {
    // a visitor's /auth/me check answers 401 on purpose
    if (res.status() >= 400 && !res.url().endsWith('/api/auth/me')) {
      problems.push(`${res.status()} ${res.request().method()} ${res.url()} (on ${page.url()})`);
    }
  });
  return page;
}

async function login(page, email, password) {
  await page.goto(BASE + '/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
}

// waits until spinners are gone and images have loaded
async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.locator('[role=status]').filter({ hasText: /Loading|Checking/ }).waitFor({ state: 'detached' }).catch(() => {});
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.complete || new Promise((r) => { img.onload = img.onerror = r; }))));
}

async function shot(page, path, name, fullPage = true) {
  if (path) await page.goto(BASE + path);
  await settle(page);
  // the placeholder image site sometimes fails the first requests of a new browser, then the
  // cards show the grey fallback. Load the page again (only when it was opened by url).
  for (let i = 0; path && i < 2 && (await page.locator('img[src*="text=JourneyHub"]').count()) > 0; i++) {
    await page.reload();
    await settle(page);
  }
  await page.screenshot({ path: outDir + name, fullPage });
  console.log('saved', name);
}

async function openCard(page, text, linkName) {
  await page.locator('.card').filter({ hasText: text }).getByRole('link', { name: linkName }).click();
}

async function readmeScreens() {
  // visitor
  const visitor = await newPage(1280, 800);
  await shot(visitor, '/destinations', 'destinations.png');
  await visitor.goto(BASE + '/destinations');
  await openCard(visitor, 'Hunza', 'View details');
  await shot(visitor, null, 'destination-details.png');
  await shot(visitor, '/stories', 'story-feed.png');

  // member
  const member = await newPage(1280, 800);
  await login(member, 'maya@journeyhub.test', 'Member123!');
  await shot(member, '/dashboard', 'member-dashboard.png');
  await member.goto(BASE + '/trips');
  await member.getByRole('link', { name: 'Spring in Lisbon' }).click();
  await shot(member, null, 'trip-plan.png');
  await member.goto(BASE + '/destinations');
  await openCard(member, 'Kyoto', 'View details');
  const listing = member.locator('.card').filter({ hasText: 'Gion Machiya House' });
  await listing.getByRole('button', { name: 'Request to book' }).click();
  await listing.getByLabel('Check-in').fill(dateFromToday(30));
  await listing.getByLabel('Check-out').fill(dateFromToday(33));
  await listing.getByLabel(/Guests/).fill('2');
  await listing.getByLabel('Note').fill('Arriving by train in the evening.');
  await member.getByRole('heading', { name: 'Where to stay' }).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 16));
  await shot(member, null, 'booking-request.png', false);
  await shot(member, '/bookings', 'booking-history.png');

  // admin
  const admin = await newPage(1280, 800);
  await login(admin, 'admin@journeyhub.test', 'Admin123!');
  await shot(admin, '/admin/destinations', 'admin-destinations.png');
  await shot(admin, '/admin/reports', 'admin-reports.png');
  await shot(admin, '/admin/bookings', 'admin-bookings.png');

  // phone
  const phone = await newPage(390, 844);
  await shot(phone, '/destinations', 'mobile-destinations.png', false);
  await login(phone, 'maya@journeyhub.test', 'Member123!');
  await phone.goto(BASE + '/dashboard');
  await phone.getByRole('button', { name: 'Toggle navigation' }).click();
  await shot(phone, null, 'mobile-menu.png', false);
}

// every main screen, `size` is used as the file name prefix
async function allScreens(size, width, height) {
  const name = (screen) => `${size}-${screen}.png`;

  const visitor = await newPage(width, height);
  await shot(visitor, '/login', name('login'));
  await shot(visitor, '/register', name('register'));
  await shot(visitor, '/destinations', name('destinations'));
  await visitor.getByLabel('Max budget ($)').fill('1000');
  await visitor.getByRole('button', { name: 'Search' }).click();
  await visitor.waitForURL(/maxBudget=1000/);
  await shot(visitor, null, name('destinations-filtered'));
  await visitor.goto(BASE + '/destinations');
  await openCard(visitor, 'Hunza', 'View details');
  await shot(visitor, null, name('destination-details-visitor'));
  await shot(visitor, '/stories', name('story-feed'));
  await visitor.locator('.card').first().getByRole('link').first().click();
  await shot(visitor, null, name('story-details'));
  await shot(visitor, '/no-such-page', name('not-found'));

  const member = await newPage(width, height);
  await login(member, 'maya@journeyhub.test', 'Member123!');
  await shot(member, '/dashboard', name('member-dashboard'));
  await member.goto(BASE + '/destinations');
  await openCard(member, 'Kyoto', 'View details');
  await shot(member, null, name('destination-details-member'));
  const listing = member.locator('.card').filter({ hasText: 'Gion Machiya House' });
  await listing.getByRole('button', { name: 'Request to book' }).click();
  await shot(member, null, name('booking-form'));
  await listing.getByRole('button', { name: /Send request/ }).click().catch(() => {});
  await shot(member, null, name('booking-form-errors'));
  await shot(member, '/stories/new', name('story-form'));
  await member.getByRole('button', { name: /Publish|Save|Post/ }).first().click();
  await shot(member, null, name('story-form-errors'));
  await shot(member, '/trips', name('trips'));
  await member.getByRole('link', { name: 'Spring in Lisbon' }).click();
  await shot(member, null, name('trip-details'));
  await member.getByPlaceholder('Add an activity').first().fill('Coffee at the market');
  await member.getByRole('button', { name: 'Add', exact: true }).first().click();
  await shot(member, null, name('trip-details-unsaved'));
  await shot(member, '/trips/new', name('trip-form'));
  await shot(member, '/favourites', name('favourites'));
  await shot(member, '/bookings', name('booking-history'));
  await shot(member, '/profile', name('profile'));
  if (width < 768) {
    await member.goto(BASE + '/dashboard');
    await member.getByRole('button', { name: 'Toggle navigation' }).click();
    await shot(member, null, name('menu-open'), false);
  }

  const admin = await newPage(width, height);
  await login(admin, 'admin@journeyhub.test', 'Admin123!');
  await shot(admin, '/admin/destinations', name('admin-destinations'));
  await shot(admin, '/admin/destinations/new', name('admin-destination-form'));
  await shot(admin, '/admin/accommodations', name('admin-accommodations'));
  await shot(admin, '/admin/bookings', name('admin-bookings'));
  await shot(admin, '/admin/reports', name('admin-reports'));
}

if (allMode) {
  await allScreens('desktop', 1280, 800);
  execSync('npm run seed', { cwd: serverDir, stdio: 'ignore' });
  await allScreens('mobile', 390, 844);
  console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join('\n')}` : '\nno console errors or failed requests');
} else {
  await readmeScreens();
}

await browser.close();
