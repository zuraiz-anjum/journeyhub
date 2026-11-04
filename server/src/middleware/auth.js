const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/httpError');

const COOKIE_NAME = 'token';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Reads the cookie and loads the user. Returns null if there is no valid token.
async function userFromRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(payload.id);
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const user = await userFromRequest(req);
  if (!user) {
    return next(new HttpError(401, 'Please log in first'));
  }
  req.user = user;
  next();
}

// Same as requireAuth but lets guests through (req.user stays undefined).
async function optionalAuth(req, res, next) {
  const user = await userFromRequest(req);
  if (user) req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Please log in first'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to do that'));
    }
    next();
  };
}

module.exports = { COOKIE_NAME, cookieOptions, signToken, requireAuth, optionalAuth, requireRole };
