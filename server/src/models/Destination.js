const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema(
  {
    city: { type: String, required: [true, 'City is required'], trim: true, maxlength: 80 },
    country: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, required: [true, 'Description is required'], trim: true, maxlength: 2000 },
    places: [{ type: String, trim: true, maxlength: 120 }],
    // rough budget for a typical trip, in USD
    estimatedBudget: {
      type: Number,
      required: [true, 'Estimated budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    imageUrl: { type: String, trim: true, default: '' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Destination', destinationSchema);
