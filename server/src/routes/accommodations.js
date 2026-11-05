const express = require('express');
const Accommodation = require('../models/Accommodation');
const Destination = require('../models/Destination');
const BookingRequest = require('../models/BookingRequest');
const HttpError = require('../utils/httpError');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { requireFields, checkId } = require('../utils/validate');

const router = express.Router();

function readNumber(value, label, min) {
  const n = Number(value);
  if (value === '' || value === null || Number.isNaN(n) || n < min) {
    throw new HttpError(400, `${label} must be a number of ${min} or more`);
  }
  return n;
}

async function readAccommodationBody(body, { partial = false } = {}) {
  if (!partial) requireFields(body, ['destination', 'name', 'pricePerNight', 'maxGuests']);
  const data = {};
  if (body.destination !== undefined) {
    checkId(body.destination, 'destination');
    const exists = await Destination.exists({ _id: body.destination });
    if (!exists) throw new HttpError(400, 'Destination does not exist');
    data.destination = body.destination;
  }
  if (body.name !== undefined) data.name = body.name;
  if (body.type !== undefined) data.type = body.type;
  if (body.description !== undefined) data.description = body.description;
  if (body.pricePerNight !== undefined) data.pricePerNight = readNumber(body.pricePerNight, 'Price per night', 0);
  if (body.maxGuests !== undefined) {
    data.maxGuests = readNumber(body.maxGuests, 'Max guests', 1);
    if (!Number.isInteger(data.maxGuests)) throw new HttpError(400, 'Max guests must be a whole number');
  }
  if (body.active !== undefined) data.active = body.active === true || body.active === 'true';
  return data;
}

// GET /api/accommodations?destination=<id>&includeInactive=true
router.get('/', optionalAuth, async (req, res) => {
  const filter = {};
  const isAdmin = req.user && req.user.role === 'admin';
  if (!(isAdmin && req.query.includeInactive === 'true')) filter.active = true;
  if (req.query.destination) {
    checkId(req.query.destination, 'destination');
    filter.destination = req.query.destination;
  }
  const accommodations = await Accommodation.find(filter)
    .sort({ pricePerNight: 1 })
    .populate('destination', 'city country archived');
  res.json({ accommodations });
});

// GET /api/accommodations/:id
router.get('/:id', optionalAuth, async (req, res) => {
  checkId(req.params.id, 'accommodation id');
  const accommodation = await Accommodation.findById(req.params.id).populate('destination', 'city country');
  const isAdmin = req.user && req.user.role === 'admin';
  if (!accommodation || (!accommodation.active && !isAdmin)) {
    throw new HttpError(404, 'Accommodation not found');
  }
  res.json({ accommodation });
});

// Admin only below
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const accommodation = await Accommodation.create(await readAccommodationBody(req.body));
  res.status(201).json({ accommodation });
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  checkId(req.params.id, 'accommodation id');
  const accommodation = await Accommodation.findById(req.params.id);
  if (!accommodation) throw new HttpError(404, 'Accommodation not found');
  Object.assign(accommodation, await readAccommodationBody(req.body, { partial: true }));
  await accommodation.save();
  res.json({ accommodation });
});

// Listings that already have booking requests are kept for the history,
// the admin should mark them inactive instead.
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  checkId(req.params.id, 'accommodation id');
  const accommodation = await Accommodation.findById(req.params.id);
  if (!accommodation) throw new HttpError(404, 'Accommodation not found');
  const hasBookings = await BookingRequest.exists({ accommodation: accommodation._id });
  if (hasBookings) {
    throw new HttpError(409, 'This listing has booking requests. Mark it inactive instead.');
  }
  await accommodation.deleteOne();
  res.json({ message: 'Accommodation deleted' });
});

module.exports = router;
