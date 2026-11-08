const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const { requireFields } = require('../utils/validate');
const { COOKIE_NAME, cookieOptions, signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register  (new accounts are always members)
router.post('/register', async (req, res) => {
  requireFields(req.body, ['name', 'email', 'password']);
  const { name, email, password } = req.body;

  if (typeof password !== 'string' || password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }
  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) {
    throw new HttpError(409, 'An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: 'member' });

  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.status(201).json({ user: user.toPublic() });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const user = await User.findOne({ email: String(req.body.email).toLowerCase().trim() });
  const ok = user && (await bcrypt.compare(String(req.body.password), user.passwordHash));
  if (!ok) {
    throw new HttpError(401, 'Wrong email or password');
  }

  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.json({ user: user.toPublic() });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me  - used by the client on page load to restore the session
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

module.exports = router;
