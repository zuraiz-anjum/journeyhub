const mongoose = require('mongoose');
const Review = require('../models/Review');

// Average rating and review count for each destination id, worked out
// from the stored reviews (hidden reviews do not count).
async function getRatingStats(destinationIds) {
  const ids = destinationIds.map((id) => new mongoose.Types.ObjectId(String(id)));
  const rows = await Review.aggregate([
    { $match: { destination: { $in: ids }, hidden: false } },
    { $group: { _id: '$destination', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const stats = {};
  for (const row of rows) {
    stats[row._id.toString()] = { averageRating: Math.round(row.average * 10) / 10, reviewCount: row.count };
  }
  return stats;
}

// Adds averageRating / reviewCount to plain destination objects
async function withRatings(destinations) {
  const stats = await getRatingStats(destinations.map((d) => d._id));
  return destinations.map((d) => ({
    ...d,
    averageRating: stats[d._id.toString()]?.averageRating ?? null,
    reviewCount: stats[d._id.toString()]?.reviewCount ?? 0,
  }));
}

module.exports = { getRatingStats, withRatings };
