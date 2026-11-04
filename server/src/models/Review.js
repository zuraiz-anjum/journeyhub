const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number' },
    },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// one review per member per destination
reviewSchema.index({ author: 1, destination: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
