const express = require('express');
const Destination = require('../models/Destination');
const HttpError = require('../utils/httpError');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { requireFields, checkId, checkUrl, escapeRegex } = require('../utils/validate');
const { withRatings } = require('../utils/ratings');

const router = express.Router();

// turns "Old town, Harbour\nMuseum" or an array into a clean list
function toPlaces(value) {
  if (Array.isArray(value)) return value.map((p) => String(p).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
  return [];
}

function readDestinationBody(body, { partial = false } = {}) {
  if (!partial) requireFields(body, ['city', 'description', 'estimatedBudget']);

  const data = {};
  if (body.city !== undefined) data.city = body.city;
  if (body.country !== undefined) data.country = body.country;
  if (body.description !== undefined) data.description = body.description;
  if (body.places !== undefined) data.places = toPlaces(body.places);
  if (body.imageUrl !== undefined) {
    checkUrl(body.imageUrl);
    data.imageUrl = body.imageUrl;
  }
  if (body.estimatedBudget !== undefined) {
    const budget = Number(body.estimatedBudget);
    if (body.estimatedBudget === '' || Number.isNaN(budget) || budget < 0) {
      throw new HttpError(400, 'Estimated budget must be a number of 0 or more');
    }
    data.estimatedBudget = budget;
  }
  return data;
}

// GET /api/destinations?city=&minBudget=&maxBudget=&includeArchived=true
router.get('/', optionalAuth, async (req, res) => {
  const { city, minBudget, maxBudget, includeArchived } = req.query;
  const filter = {};

  // only the admin can see archived destinations
  const isAdmin = req.user && req.user.role === 'admin';
  if (!(isAdmin && includeArchived === 'true')) filter.archived = false;

  if (city) {
    const pattern = new RegExp(escapeRegex(String(city).trim()), 'i');
    filter.$or = [{ city: pattern }, { country: pattern }];
  }
  if (minBudget || maxBudget) {
    const min = Number(minBudget || 0);
    const max = Number(maxBudget || 0);
    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < 0) {
      throw new HttpError(400, 'Budget filters must be positive numbers');
    }
    if (minBudget && maxBudget && min > max) {
      throw new HttpError(400, 'Minimum budget cannot be more than the maximum');
    }
    filter.estimatedBudget = {};
    if (minBudget) filter.estimatedBudget.$gte = min;
    if (maxBudget) filter.estimatedBudget.$lte = max;
  }

  const destinations = await Destination.find(filter).sort({ city: 1 }).lean();
  res.json({ destinations: await withRatings(destinations) });
});

// GET /api/destinations/:id
router.get('/:id', optionalAuth, async (req, res) => {
  checkId(req.params.id, 'destination id');
  const destination = await Destination.findById(req.params.id).lean();
  const isAdmin = req.user && req.user.role === 'admin';
  if (!destination || (destination.archived && !isAdmin)) {
    throw new HttpError(404, 'Destination not found');
  }
  const [withStats] = await withRatings([destination]);
  const isFavourite = !!req.user && req.user.favourites.some((f) => f.toString() === destination._id.toString());
  res.json({ destination: { ...withStats, isFavourite } });
});

// Admin only below
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const destination = await Destination.create(readDestinationBody(req.body));
  res.status(201).json({ destination });
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  checkId(req.params.id, 'destination id');
  const destination = await Destination.findById(req.params.id);
  if (!destination) throw new HttpError(404, 'Destination not found');

  Object.assign(destination, readDestinationBody(req.body, { partial: true }));
  await destination.save();
  res.json({ destination });
});

// PATCH /api/destinations/:id/archive  body: { archived: true | false }
// We archive instead of deleting so stories and reviews keep their destination.
router.patch('/:id/archive', requireAuth, requireRole('admin'), async (req, res) => {
  checkId(req.params.id, 'destination id');
  const destination = await Destination.findById(req.params.id);
  if (!destination) throw new HttpError(404, 'Destination not found');

  destination.archived = req.body.archived !== false;
  await destination.save();
  res.json({ destination });
});

module.exports = router;
