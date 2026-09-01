const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
  _id: { type: String },
  city: { type: String, default: 'Marbella' }, // which city this venue belongs to (e.g. 'Marbella', 'Málaga')
  name: String,
  area: String,
  address: String,
  type: String,
  genres: [String],
  rating: Number,
  image: String,
  lat: Number,
  lng: Number,
  crowdStatus: { type: String, enum: ['quiet', 'getting_busy', 'busy', 'packed'], default: 'quiet' },
  crowdUpdatedAt: { type: Date, default: Date.now },
  ratings: {
    music: Number, atmosphere: Number, crowd: Number, staff: Number, drinks: Number, venue: Number,
  },
  bestNights: [{ day: String, stars: Number }],
  bestArrival: String,
  opening: String,
  closing: String,
  dressCode: String,
  verified: Boolean,
}, { _id: false });

module.exports = mongoose.model('Venue', venueSchema);
