const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: [true, 'Destination is required'] },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    travelDate: { type: Date, required: [true, 'Travel date is required'] },
    text: { type: String, required: [true, 'Story text is required'], trim: true, maxlength: 10000 },
    imageUrl: { type: String, trim: true, default: '' },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

storySchema.index({ title: 'text', text: 'text' });

module.exports = mongoose.model('Story', storySchema);
