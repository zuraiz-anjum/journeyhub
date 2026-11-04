const express = require('express');
const { requireAuth } = require('../middleware/auth');
const HttpError = require('../utils/httpError');

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

module.exports = router;
