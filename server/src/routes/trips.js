const express = require('express');
const TripPlan = require('../models/TripPlan');
const Destination = require('../models/Destination');
const HttpError = require('../utils/httpError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireFields, parseDate, checkDateRange, checkId } = require('../utils/validate');

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TRIP_DAYS = 60;

// Trip plans belong to members and are private, so every route needs a member login.
router.use(requireAuth, requireRole('member'));

async function loadOwnTrip(req) {
  checkId(req.params.id, 'trip id');
  const trip = await TripPlan.findById(req.params.id);
  if (!trip) throw new HttpError(404, 'Trip plan not found');
  if (trip.owner.toString() !== req.user._id.toString()) {
    throw new HttpError(403, 'This trip plan is private');
  }
  return trip;
}

function tripLength(start, end) {
  return Math.round((end - start) / DAY_MS) + 1;
}

// alreadyOnTrip: destinations the trip had before an edit. They may have been archived
// since, which is fine, the member only cannot add an archived destination as a new one.
async function cleanDestinations(list, alreadyOnTrip = []) {
  if (!Array.isArray(list)) throw new HttpError(400, 'Destinations must be a list');
  const ids = [...new Set(list.map(String))];
  ids.forEach((id) => checkId(id, 'destination'));
  const kept = new Set(alreadyOnTrip.map(String));
  const added = ids.filter((id) => !kept.has(id));
  const count = await Destination.countDocuments({ _id: { $in: added }, archived: false });
  if (count !== added.length) throw new HttpError(400, 'One of the destinations does not exist');
  return ids;
}

function cleanDays(days, numberOfDays) {
  if (!Array.isArray(days)) throw new HttpError(400, 'Days must be a list');
  const seen = new Set();
  return days
    .map((day) => {
      const dayNumber = Number(day && day.dayNumber);
      if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > numberOfDays) {
        throw new HttpError(400, `Day number must be between 1 and ${numberOfDays}`);
      }
      if (seen.has(dayNumber)) throw new HttpError(400, `Day ${dayNumber} is listed twice`);
      seen.add(dayNumber);
      const activities = (day && Array.isArray(day.activities) ? day.activities : [])
        .map((a) => String(a).trim())
        .filter(Boolean);
      return { dayNumber, activities };
    })
    .sort((a, b) => a.dayNumber - b.dayNumber);
}

// GET /api/trips   the logged in member's plans only
router.get('/', async (req, res) => {
  const trips = await TripPlan.find({ owner: req.user._id })
    .sort({ startDate: 1 })
    .populate('destinations', 'city country');
  res.json({ trips });
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  const trip = await loadOwnTrip(req);
  await trip.populate('destinations', 'city country imageUrl');
  res.json({ trip });
});

// POST /api/trips
router.post('/', async (req, res) => {
  requireFields(req.body, ['title', 'startDate', 'endDate']);
  const startDate = parseDate(req.body.startDate, 'Start date');
  const endDate = parseDate(req.body.endDate, 'End date');
  checkDateRange(startDate, endDate);
  const days = tripLength(startDate, endDate);
  if (days > MAX_TRIP_DAYS) throw new HttpError(400, `Trips can be at most ${MAX_TRIP_DAYS} days long`);

  const trip = await TripPlan.create({
    owner: req.user._id,
    title: req.body.title,
    startDate,
    endDate,
    notes: req.body.notes || '',
    destinations: await cleanDestinations(req.body.destinations || []),
    days: cleanDays(req.body.days || [], days),
  });
  res.status(201).json({ trip });
});

// PUT /api/trips/:id   (owner only)
router.put('/:id', async (req, res) => {
  const trip = await loadOwnTrip(req);
  const { title, startDate, endDate, notes, destinations, days } = req.body;

  if (title !== undefined) {
    if (String(title).trim() === '') throw new HttpError(400, 'Title cannot be empty');
    trip.title = title;
  }
  if (notes !== undefined) trip.notes = notes;
  if (startDate !== undefined) trip.startDate = parseDate(startDate, 'Start date');
  if (endDate !== undefined) trip.endDate = parseDate(endDate, 'End date');
  checkDateRange(trip.startDate, trip.endDate);

  const length = tripLength(trip.startDate, trip.endDate);
  if (length > MAX_TRIP_DAYS) throw new HttpError(400, `Trips can be at most ${MAX_TRIP_DAYS} days long`);

  if (destinations !== undefined) trip.destinations = await cleanDestinations(destinations, trip.destinations);
  if (days !== undefined) {
    trip.days = cleanDays(days, length);
  } else if (trip.days.some((d) => d.dayNumber > length)) {
    // the trip got shorter, drop the days that no longer fit
    trip.days = trip.days.filter((d) => d.dayNumber <= length);
  }

  await trip.save();
  await trip.populate('destinations', 'city country imageUrl');
  res.json({ trip });
});

// DELETE /api/trips/:id   (owner only)
router.delete('/:id', async (req, res) => {
  const trip = await loadOwnTrip(req);
  await trip.deleteOne();
  res.json({ message: 'Trip plan deleted' });
});

module.exports = router;
