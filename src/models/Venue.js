const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  _id: { type: String },
  name: String,
  area: String,
  type: String,
  genres: [String],
  rating: Number,
  image: String,
  crowdStatus: { type: String, enum: ['quiet', 'getting_busy', 'busy', 'packed'], default: 'quiet' },
  crowdUpdatedAt: { type: Date, default: Date.now },
  ratings: {
    music: Number, atmosphere: Number, crowd: Number, staff: Number, drinks: Number, venue: Number,
  },
  bestNights: [{ day: String, stars: Number }],
  bestArrival: String,
  closing: String,
  verified: Boolean,
}, { _id: false });

module.exports = mongoose.model('Venue', venueSchema);
