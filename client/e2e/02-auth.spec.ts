import { test, expect, login, logout, MAYA } from './helpers';

test('sign up checks the form, then creates a member account', async ({ page }) => {
  await page.goto('/register');
  const submit = page.getByRole('button', { name: 'Sign up' });
  const alert = page.getByRole('alert');

  await submit.click();
  await expect(alert).toHaveText('Please enter your name');

  await page.getByLabel('Name').fill('Sara Khan');
  await page.getByLabel('Email').fill('sara-at-example');
  await submit.click();
  await expect(alert).toHaveText('Please enter a valid email');

  await page.getByLabel('Email').fill('sara@journeyhub.test');
  await page.getByLabel('Password', { exact: true }).fill('abc');
  await submit.click();
  await expect(alert).toHaveText('Password must be at least 6 characters');

  await page.getByLabel('Password', { exact: true }).fill('secret12');
  await page.getByLabel('Confirm password').fill('secret13');
  await submit.click();
  await expect(alert).toHaveText('Passwords do not match');

  // an email that is already used is rejected by the server
  await page.getByLabel('Email').fill(MAYA.email);
  await page.getByLabel('Confirm password').fill('secret12');
  await submit.click();
  await expect(alert).toContainText(/already/i);

  await page.getByLabel('Email').fill('sara@journeyhub.test');
  await submit.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Hi Sara Khan!' })).toBeVisible();

  // a brand new member has nothing yet
  const counts = page.locator('.display-6');
  await expect(counts).toHaveText(['0', '0', '0', '0', '0']);
  await expect(page.getByText('You have not written any stories yet')).toBeVisible();

  await page.getByRole('link', { name: 'Saved', exact: true }).click();
  await expect(page.getByText('You have not saved any destinations yet')).toBeVisible();
  await page.getByRole('link', { name: 'My Trips', exact: true }).click();
  await expect(page.getByText('No trips planned yet')).toBeVisible();
  await page.getByRole('link', { name: 'Bookings', exact: true }).click();
  await expect(page.getByText('No booking requests yet')).toBeVisible();

  // the session survives a page reload (cookie + /auth/me)
  await page.reload();
  await expect(page.getByRole('link', { name: 'Sara Khan' })).toBeVisible();

  await logout(page);
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('log in shows errors and sends the member back to the page they wanted', async ({ page }) => {
  await page.goto('/login');
  const alert = page.getByRole('alert');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(alert).toHaveText('Please enter your email and password');

  await page.getByLabel('Email').fill(MAYA.email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(alert).toContainText(/invalid|incorrect|wrong/i);

  // a protected page remembers where to go after login
  await page.goto('/trips');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(MAYA.email);
  await page.getByLabel('Password').fill(MAYA.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByText('Spring in Lisbon')).toBeVisible();

  // logged in users are sent away from the login and sign up pages
  await page.goto('/login');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/register');
  await expect(page).toHaveURL(/\/dashboard$/);

  await logout(page);
  // the old error is not shown again on the next visit
  await page.goto('/login');
  await expect(alert).toHaveCount(0);
});

test('profile edit', async ({ page }) => {
  await login(page, MAYA);
  await page.getByRole('link', { name: MAYA.name }).click();
  await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible();
  await expect(page.getByLabel('Home city')).toHaveValue('Lahore');

  await page.getByLabel('Name').fill('   ');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('alert')).toHaveText('Name cannot be empty');

  await page.getByLabel('Name').fill('Maya R.');
  await page.getByLabel('Home city').fill('Islamabad');
  await page.getByLabel('About me').fill('Weekend hiker and slow traveller.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved')).toBeVisible();
  // the navbar uses the new name straight away
  await expect(page.getByRole('link', { name: 'Maya R.' })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Home city')).toHaveValue('Islamabad');
  await expect(page.getByLabel('Name')).toHaveValue('Maya R.');

  // put the name back so the other tests can find it
  await page.getByLabel('Name').fill(MAYA.name);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved')).toBeVisible();
});
