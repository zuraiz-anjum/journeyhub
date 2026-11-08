const express = require('express');
const Story = require('../models/Story');
const Destination = require('../models/Destination');
const HttpError = require('../utils/httpError');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const { requireFields, parseDate, checkId, checkUrl, escapeRegex } = require('../utils/validate');

const router = express.Router();

const MAX_PAGE_SIZE = 20;

function isOwner(story, user) {
  return user && story.author && story.author._id.toString() === user._id.toString();
}

async function loadStory(id) {
  checkId(id, 'story id');
  const story = await Story.findById(id)
    .populate('author', 'name')
    .populate('destination', 'city country');
  if (!story) throw new HttpError(404, 'Story not found');
  return story;
}

async function checkDestination(id) {
  checkId(id, 'destination');
  const destination = await Destination.findById(id);
  if (!destination || destination.archived) {
    throw new HttpError(400, 'Please pick a destination from the list');
  }
}

function checkTravelDate(value) {
  const date = parseDate(value, 'Travel date');
  // stories are about trips that already happened (allow a day of slack for time zones)
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    throw new HttpError(400, 'Travel date cannot be in the future');
  }
  return date;
}

// GET /api/stories?q=&destination=&mine=true&page=1&limit=6
router.get('/', optionalAuth, async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), MAX_PAGE_SIZE);
  const filter = {};

  if (req.query.mine === 'true') {
    if (!req.user) throw new HttpError(401, 'Please log in first');
    filter.author = req.user._id; // owners still see their hidden stories
  } else if (!(req.user && req.user.role === 'admin')) {
    filter.hidden = false;
  }

  if (req.query.destination) {
    checkId(req.query.destination, 'destination');
    filter.destination = req.query.destination;
  }
  if (req.query.q) {
    const pattern = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    filter.$or = [{ title: pattern }, { text: pattern }];
  }

  const [stories, total] = await Promise.all([
    Story.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'name')
      .populate('destination', 'city country'),
    Story.countDocuments(filter),
  ]);

  res.json({ stories, page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) });
});

// GET /api/stories/:id
router.get('/:id', optionalAuth, async (req, res) => {
  const story = await loadStory(req.params.id);
  const isAdmin = req.user && req.user.role === 'admin';
  if (story.hidden && !isOwner(story, req.user) && !isAdmin) {
    throw new HttpError(404, 'Story not found');
  }
  res.json({ story });
});

// POST /api/stories
router.post('/', requireAuth, requireRole('member'), async (req, res) => {
  requireFields(req.body, ['destination', 'title', 'travelDate', 'text']);
  const { destination, title, travelDate, text, imageUrl } = req.body;
  await checkDestination(destination);
  checkUrl(imageUrl);

  const story = await Story.create({
    author: req.user._id,
    destination,
    title,
    travelDate: checkTravelDate(travelDate),
    text,
    imageUrl: imageUrl || '',
  });
  res.status(201).json({ story });
});

// PUT /api/stories/:id  (owner only)
router.put('/:id', requireAuth, async (req, res) => {
  const story = await loadStory(req.params.id);
  if (!isOwner(story, req.user)) {
    throw new HttpError(403, 'You can only edit your own stories');
  }

  const { destination, title, travelDate, text, imageUrl } = req.body;
  if (title !== undefined) {
    if (String(title).trim() === '') throw new HttpError(400, 'Title cannot be empty');
    story.title = title;
  }
  if (text !== undefined) {
    if (String(text).trim() === '') throw new HttpError(400, 'Story text cannot be empty');
    story.text = text;
  }
  if (travelDate !== undefined) story.travelDate = checkTravelDate(travelDate);
  if (imageUrl !== undefined) {
    checkUrl(imageUrl);
    story.imageUrl = imageUrl;
  }
  // only check the destination when it changed, so a story about a place that was
  // archived later can still be edited
  if (destination !== undefined && String(destination) !== story.destination?._id.toString()) {
    await checkDestination(destination);
    story.destination = destination;
  }

  await story.save();
  await story.populate('destination', 'city country');
  res.json({ story });
});

// DELETE /api/stories/:id  (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const story = await loadStory(req.params.id);
  if (!isOwner(story, req.user)) {
    throw new HttpError(403, 'You can only delete your own stories');
  }
  await story.deleteOne();
  res.json({ message: 'Story deleted' });
});

module.exports = router;
