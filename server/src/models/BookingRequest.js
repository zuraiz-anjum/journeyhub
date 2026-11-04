const mongoose = require('mongoose');

const bookingRequestSchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accommodation: { type: mongoose.Schema.Types.ObjectId, ref: 'Accommodation', required: true },
    checkIn: { type: Date, required: [true, 'Check-in date is required'] },
    checkOut: { type: Date, required: [true, 'Check-out date is required'] },
    guests: { type: Number, required: [true, 'Guest count is required'], min: [1, 'At least 1 guest'] },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Rejected', 'Cancelled'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BookingRequest', bookingRequestSchema);
