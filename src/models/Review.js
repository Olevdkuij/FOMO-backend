const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  venueId: { type: String, required: true },
  userId: { type: String, required: true },
  ratings: {
    music: Number, atmosphere: Number, crowd: Number, staff: Number, drinks: Number,
  },
  wouldReturn: Boolean,
  text: String,
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
