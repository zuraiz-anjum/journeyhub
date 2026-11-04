const mongoose = require('mongoose');

const accommodationSchema = new mongoose.Schema(
  {
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: [true, 'Destination is required'] },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 120 },
    type: { type: String, enum: ['hotel', 'hostel', 'guesthouse', 'apartment'], default: 'hotel' },
    pricePerNight: { type: Number, required: [true, 'Price per night is required'], min: [0, 'Price cannot be negative'] },
    maxGuests: { type: Number, required: [true, 'Max guests is required'], min: [1, 'Max guests must be at least 1'] },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Accommodation', accommodationSchema);
