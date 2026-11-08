// Saves the README screenshots to docs/screenshots.
// Needs MongoDB, the API (port 5000) and the Vite dev server (port 5173) running.
// It reseeds the database first so the pictures always show the demo data.
// Run from the client folder: npm run screenshots
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const outDir = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url));
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

async function newPage(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  return context.newPage();
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
  await page.screenshot({ path: outDir + name, fullPage });
  console.log('saved', name);
}

async function openCard(page, text, linkName) {
  await page.locator('.card').filter({ hasText: text }).getByRole('link', { name: linkName }).click();
}

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

await browser.close();
