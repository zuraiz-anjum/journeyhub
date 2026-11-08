const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const Destination = require('../models/Destination');
const Story = require('../models/Story');
const Review = require('../models/Review');
const TripPlan = require('../models/TripPlan');
const HttpError = require('../utils/httpError');
const { checkId } = require('../utils/validate');
const { withRatings } = require('../utils/ratings');

const router = express.Router();

router.use(requireAuth);

// GET /api/users/me
router.get('/me', (req, res) => {
  res.json({ user: req.user.toPublic() });
});

// PUT /api/users/me  - only name, bio and home city can be changed here
router.put('/me', async (req, res) => {
  const { name, bio, homeCity } = req.body;
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new HttpError(400, 'Name cannot be empty');
    }
    req.user.name = name;
  }
  if (bio !== undefined) req.user.bio = bio;
  if (homeCity !== undefined) req.user.homeCity = homeCity;

  await req.user.save();
  res.json({ user: req.user.toPublic() });
});

// GET /api/users/me/dashboard   counts for the member dashboard
router.get('/me/dashboard', requireRole('member'), async (req, res) => {
  const [stories, reviews, tripPlans, savedPlaces] = await Promise.all([
    Story.countDocuments({ author: req.user._id }),
    Review.countDocuments({ author: req.user._id }),
    TripPlan.countDocuments({ owner: req.user._id }),
    Destination.countDocuments({ _id: { $in: req.user.favourites }, archived: false }),
  ]);
  res.json({ counts: { stories, reviews, tripPlans, savedPlaces } });
});

// GET /api/users/me/favourites
router.get('/me/favourites', requireRole('member'), async (req, res) => {
  const destinations = await Destination.find({ _id: { $in: req.user.favourites }, archived: false })
    .sort({ city: 1 })
    .lean();
  res.json({ destinations: await withRatings(destinations) });
});

// POST /api/users/me/favourites/:destinationId
router.post('/me/favourites/:destinationId', requireRole('member'), async (req, res) => {
  const { destinationId } = req.params;
  checkId(destinationId, 'destination id');
  const destination = await Destination.findById(destinationId);
  if (!destination || destination.archived) throw new HttpError(404, 'Destination not found');

  // $addToSet so saving twice does not add a duplicate
  await req.user.updateOne({ $addToSet: { favourites: destination._id } });
  res.status(201).json({ message: 'Saved to favourites' });
});

// DELETE /api/users/me/favourites/:destinationId
router.delete('/me/favourites/:destinationId', requireRole('member'), async (req, res) => {
  checkId(req.params.destinationId, 'destination id');
  await req.user.updateOne({ $pull: { favourites: req.params.destinationId } });
  res.json({ message: 'Removed from favourites' });
});

module.exports = router;
