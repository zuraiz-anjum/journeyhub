const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 60 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Email is not valid'],
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    homeCity: { type: String, trim: true, maxlength: 60, default: '' },
    favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }],
  },
  { timestamps: true }
);

// never send the password hash back to the client
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    bio: this.bio,
    homeCity: this.homeCity,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
