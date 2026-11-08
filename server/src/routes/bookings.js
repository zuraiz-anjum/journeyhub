const express = require('express');
const BookingRequest = require('../models/BookingRequest');
const Accommodation = require('../models/Accommodation');
const HttpError = require('../utils/httpError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireFields, parseDate, checkId } = require('../utils/validate');

const router = express.Router();

const STATUSES = ['Pending', 'Confirmed', 'Rejected', 'Cancelled'];

router.use(requireAuth);

const DAY_MS = 24 * 60 * 60 * 1000;

// Earliest check-in date we accept. Dates from the form come in as YYYY-MM-DD which JS
// reads as UTC midnight. The member's "today" can be a day behind UTC (or ahead of it),
// so allow one day of slack, same as story travel dates.
function earliestCheckIn() {
  return new Date(new Date(new Date().toISOString().slice(0, 10)).getTime() - DAY_MS);
}

async function loadBooking(id) {
  checkId(id, 'booking id');
  const booking = await BookingRequest.findById(id);
  if (!booking) throw new HttpError(404, 'Booking request not found');
  return booking;
}

function populateBooking(query) {
  return query
    .populate({ path: 'accommodation', select: 'name type pricePerNight destination', populate: { path: 'destination', select: 'city country' } })
    .populate('member', 'name email');
}

// GET /api/bookings   members get their own history, the admin gets everything
router.get('/', async (req, res) => {
  const filter = {};
  if (req.user.role !== 'admin') filter.member = req.user._id;
  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) throw new HttpError(400, 'Unknown status');
    filter.status = req.query.status;
  }
  const bookings = await populateBooking(BookingRequest.find(filter).sort({ createdAt: -1 }));
  res.json({ bookings });
});

// POST /api/bookings   body: { accommodation, checkIn, checkOut, guests, note }
router.post('/', requireRole('member'), async (req, res) => {
  requireFields(req.body, ['accommodation', 'checkIn', 'checkOut', 'guests']);
  checkId(req.body.accommodation, 'accommodation');

  const accommodation = await Accommodation.findById(req.body.accommodation);
  if (!accommodation || !accommodation.active) throw new HttpError(404, 'Accommodation not found');

  const checkIn = parseDate(req.body.checkIn, 'Check-in date');
  const checkOut = parseDate(req.body.checkOut, 'Check-out date');
  if (checkIn < earliestCheckIn()) throw new HttpError(400, 'Check-in date cannot be in the past');
  if (checkOut <= checkIn) throw new HttpError(400, 'Check-out must be at least one day after check-in');

  const guests = Number(req.body.guests);
  if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, 'Guests must be a whole number of 1 or more');
  if (guests > accommodation.maxGuests) {
    throw new HttpError(400, `This place takes at most ${accommodation.maxGuests} guests`);
  }

  const booking = await BookingRequest.create({
    member: req.user._id,
    accommodation: accommodation._id,
    checkIn,
    checkOut,
    guests,
    note: req.body.note || '',
  });
  res.status(201).json({ booking });
});

// PATCH /api/bookings/:id/cancel   member can cancel their own Pending request
router.patch('/:id/cancel', requireRole('member'), async (req, res) => {
  const booking = await loadBooking(req.params.id);
  if (booking.member.toString() !== req.user._id.toString()) {
    throw new HttpError(403, 'You can only cancel your own requests');
  }
  if (booking.status !== 'Pending') {
    throw new HttpError(409, `Only pending requests can be cancelled (this one is ${booking.status})`);
  }
  booking.status = 'Cancelled';
  await booking.save();
  res.json({ booking });
});

// PATCH /api/bookings/:id/status   body: { status: 'Confirmed' | 'Rejected' }   (admin)
router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  if (!['Confirmed', 'Rejected'].includes(status)) {
    throw new HttpError(400, "Status must be 'Confirmed' or 'Rejected'");
  }
  const booking = await loadBooking(req.params.id);
  if (booking.status !== 'Pending') {
    throw new HttpError(409, `This request is already ${booking.status}`);
  }
  booking.status = status;
  await booking.save();
  res.json({ booking });
});

module.exports = router;
