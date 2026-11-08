const mongoose = require('mongoose');
const HttpError = require('./httpError');

// Helpers used by the routes before anything touches the database.
// Mongoose validates again on save, but checking here gives clearer messages.

function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const value = body[f];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });
  if (missing.length > 0) {
    throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
}

function parseDate(value, label) {
  const date = new Date(value);
  if (value === undefined || value === null || value === '' || Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${label} is not a valid date`);
  }
  return date;
}

function checkDateRange(start, end, startLabel = 'Start date', endLabel = 'End date') {
  if (end < start) {
    throw new HttpError(400, `${endLabel} cannot be before ${startLabel.toLowerCase()}`);
  }
}

function checkRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be a whole number from 1 to 5');
  }
  return rating;
}

function checkId(id, label = 'id') {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
}

function isValidUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function checkUrl(value, label = 'Image URL') {
  if (!isValidUrl(value)) {
    throw new HttpError(400, `${label} must start with http:// or https://`);
  }
}

// Escape user input before putting it in a RegExp
function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { requireFields, parseDate, checkDateRange, checkRating, checkId, checkUrl, escapeRegex };
