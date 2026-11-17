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

// currentDestination: the destination an edited listing already has. A listing may keep a
// destination that was archived later, but it cannot be added to or moved onto one.
async function readAccommodationBody(body, { partial = false, currentDestination = null } = {}) {
  if (!partial) requireFields(body, ['destination', 'name', 'pricePerNight', 'maxGuests']);
  const data = {};
  if (body.destination !== undefined) {
    checkId(body.destination, 'destination');
    const destination = await Destination.findById(body.destination).select('archived');
    if (!destination) throw new HttpError(400, 'Destination does not exist');
    const keepsCurrent = currentDestination && currentDestination.toString() === destination._id.toString();
    if (destination.archived && !keepsCurrent) {
      throw new HttpError(400, 'Destination is archived, listings cannot be added to it');
    }
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
// includeInactive is the admin management view, it also lists stays at archived destinations.
router.get('/', optionalAuth, async (req, res) => {
  const filter = {};
  const isAdmin = req.user && req.user.role === 'admin';
  if (!(isAdmin && req.query.includeInactive === 'true')) {
    filter.active = true;
    // archived destinations are hidden from members, so are their listings
    const archived = await Destination.distinct('_id', { archived: true });
    filter.destination = { $nin: archived };
  }
  if (req.query.destination) {
    checkId(req.query.destination, 'destination');
    filter.destination = { ...filter.destination, $eq: req.query.destination };
  }
  const accommodations = await Accommodation.find(filter)
    .sort({ pricePerNight: 1 })
    .populate('destination', 'city country archived');
  res.json({ accommodations });
});

// GET /api/accommodations/:id
router.get('/:id', optionalAuth, async (req, res) => {
  checkId(req.params.id, 'accommodation id');
  const accommodation = await Accommodation.findById(req.params.id).populate('destination', 'city country archived');
  const isAdmin = req.user && req.user.role === 'admin';
  const visible = accommodation && accommodation.active && accommodation.destination && !accommodation.destination.archived;
  if (!accommodation || (!visible && !isAdmin)) {
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
  const data = await readAccommodationBody(req.body, { partial: true, currentDestination: accommodation.destination });
  Object.assign(accommodation, data);
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
