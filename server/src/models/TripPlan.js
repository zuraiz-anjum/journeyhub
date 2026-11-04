const mongoose = require('mongoose');

const daySchema = new mongoose.Schema(
  {
    dayNumber: { type: Number, required: true, min: 1 },
    activities: [{ type: String, trim: true, maxlength: 200 }],
  },
  { _id: false }
);

const tripPlanSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    startDate: { type: Date, required: [true, 'Start date is required'] },
    endDate: { type: Date, required: [true, 'End date is required'] },
    destinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
    days: [daySchema],
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TripPlan', tripPlanSchema);
