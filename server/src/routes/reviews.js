const express = require('express');
const Review = require('../models/Review');
const Destination = require('../models/Destination');
const HttpError = require('../utils/httpError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireFields, checkRating, checkId } = require('../utils/validate');

const router = express.Router();

async function loadOwnReview(req) {
  checkId(req.params.id, 'review id');
  const review = await Review.findById(req.params.id);
  if (!review) throw new HttpError(404, 'Review not found');
  if (review.author.toString() !== req.user._id.toString()) {
    throw new HttpError(403, "You cannot change another member's review");
  }
  return review;
}

// GET /api/reviews?destination=<id>   public list for a destination
router.get('/', async (req, res) => {
  if (!req.query.destination) throw new HttpError(400, 'destination query parameter is required');
  checkId(req.query.destination, 'destination');

  const reviews = await Review.find({ destination: req.query.destination, hidden: false })
    .sort({ updatedAt: -1 })
    .populate('author', 'name');
  res.json({ reviews });
});

// GET /api/reviews/mine?destination=<id>   the logged in member's review (or null)
router.get('/mine', requireAuth, async (req, res) => {
  checkId(req.query.destination, 'destination');
  const review = await Review.findOne({ destination: req.query.destination, author: req.user._id });
  res.json({ review });
});

// POST /api/reviews   body: { destination, rating, comment }
router.post('/', requireAuth, requireRole('member'), async (req, res) => {
  requireFields(req.body, ['destination', 'rating']);
  const rating = checkRating(req.body.rating);
  checkId(req.body.destination, 'destination');

  const destination = await Destination.findById(req.body.destination);
  if (!destination || destination.archived) throw new HttpError(404, 'Destination not found');

  const existing = await Review.findOne({ destination: destination._id, author: req.user._id });
  if (existing) {
    throw new HttpError(409, 'You already reviewed this destination. Edit your review instead.');
  }

  const review = await Review.create({
    author: req.user._id,
    destination: destination._id,
    rating,
    comment: req.body.comment || '',
  });
  res.status(201).json({ review });
});

// PUT /api/reviews/:id   (author only)
router.put('/:id', requireAuth, async (req, res) => {
  const review = await loadOwnReview(req);
  if (req.body.rating !== undefined) review.rating = checkRating(req.body.rating);
  if (req.body.comment !== undefined) review.comment = req.body.comment;
  await review.save();
  res.json({ review });
});

// DELETE /api/reviews/:id   (author only)
router.delete('/:id', requireAuth, async (req, res) => {
  const review = await loadOwnReview(req);
  await review.deleteOne();
  res.json({ message: 'Review deleted' });
});

module.exports = router;
