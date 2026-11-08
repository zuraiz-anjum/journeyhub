import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import api from '../api/client';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import { admin, member, ok, renderPage, serverError } from '../test/utils';

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  default: { get: vi.fn(), post: vi.fn() },
}));
const mockedApi = vi.mocked(api, true);

describe('LoginPage', () => {
  function setup() {
    renderPage(<LoginPage />, { route: '/login', path: '/login' });
    return {
      email: screen.getByLabelText('Email'),
      password: screen.getByLabelText('Password'),
      submit: screen.getByRole('button', { name: 'Log in' }),
    };
  }

  it('asks for both fields and does not send anything when they are empty', async () => {
    const user = userEvent.setup();
    const { email, submit } = setup();
    await user.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your email and password');

    await user.type(email, 'maya@journeyhub.test');
    await user.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your email and password');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('logs a member in and goes to the dashboard', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValueOnce(ok({ user: member }));
    const { email, password, submit } = setup();
    await user.type(email, '  maya@journeyhub.test ');
    await user.type(password, 'Member123!');
    await user.click(submit);

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login', {
      email: 'maya@journeyhub.test',
      password: 'Member123!',
    });
    expect(await screen.findByTestId('location')).toHaveTextContent('/dashboard');
  });

  it('sends the admin to the admin pages', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValueOnce(ok({ user: admin }));
    const { email, password, submit } = setup();
    await user.type(email, 'admin@journeyhub.test');
    await user.type(password, 'Admin123!');
    await user.click(submit);
    expect(await screen.findByTestId('location')).toHaveTextContent('/admin/destinations');
  });

  it('shows the server message for a wrong password and stays on the page', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValueOnce(serverError(401, 'Wrong email or password'));
    const { email, password, submit } = setup();
    await user.type(email, 'maya@journeyhub.test');
    await user.type(password, 'wrong');
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password');
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('redirects someone who is already logged in', () => {
    renderPage(<LoginPage />, { route: '/login', path: '/login', user: member });
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
  });
});

describe('RegisterPage', () => {
  function setup() {
    renderPage(<RegisterPage />, { route: '/register', path: '/register' });
    return {
      name: screen.getByLabelText('Name'),
      email: screen.getByLabelText('Email'),
      password: screen.getByLabelText('Password'),
      confirm: screen.getByLabelText('Confirm password'),
      submit: screen.getByRole('button', { name: 'Sign up' }),
    };
  }

  it('shows one validation message at a time, in order', async () => {
    const user = userEvent.setup();
    const f = setup();
    const alertText = () => screen.getByRole('alert').textContent;

    await user.click(f.submit);
    expect(alertText()).toBe('Please enter your name');

    await user.type(f.name, 'Sara Khan');
    await user.type(f.email, 'sara-at-example');
    await user.click(f.submit);
    expect(alertText()).toBe('Please enter a valid email');

    await user.clear(f.email);
    await user.type(f.email, 'sara@example.com');
    await user.type(f.password, '12345');
    await user.click(f.submit);
    expect(alertText()).toBe('Password must be at least 6 characters');

    await user.type(f.password, '6');
    await user.type(f.confirm, '1234567');
    await user.click(f.submit);
    expect(alertText()).toBe('Passwords do not match');

    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('a name of only spaces is not accepted', async () => {
    const user = userEvent.setup();
    const f = setup();
    await user.type(f.name, '   ');
    await user.click(f.submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your name');
  });

  it('creates the account with trimmed values and opens the dashboard', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValueOnce(ok({ user: { ...member, name: 'Sara Khan' } }));
    const f = setup();
    await user.type(f.name, ' Sara Khan ');
    await user.type(f.email, 'sara@example.com ');
    await user.type(f.password, 'secret12');
    await user.type(f.confirm, 'secret12');
    await user.click(f.submit);

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/register', {
      name: 'Sara Khan',
      email: 'sara@example.com',
      password: 'secret12',
    });
    expect(await screen.findByTestId('location')).toHaveTextContent('/dashboard');
  });

  it('shows the server message when the email is already used', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValueOnce(serverError(409, 'An account with that email already exists'));
    const f = setup();
    await user.type(f.name, 'Maya');
    await user.type(f.email, 'maya@journeyhub.test');
    await user.type(f.password, 'secret12');
    await user.type(f.confirm, 'secret12');
    await user.click(f.submit);

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with that email already exists');
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
  });
});
