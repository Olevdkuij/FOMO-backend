const mongoose = require('mongoose');

// A confirmed weekly themed night with no one-off date (e.g. "Feel Good
// Fridays" every Friday at a beach club). The source data carries no stable
// id for these, so the whole collection is replaced wholesale on every sync
// rather than upserted — see routes/marbellaEvents.js.
const recurringNightSchema = new mongoose.Schema({
  city: { type: String, default: 'Marbella' },
  venue: { type: String, required: true },
  venueArea: String,
  address: String,
  dayOfWeek: { type: String, required: true },
  startTime: String,
  endTime: String,
  time: String, // deprecated combined "HH:MM-HH:MM" string, kept for older synced data
  seriesName: { type: String, required: true },
  djOrArtist: String,
  genre: String,
  description: String,
  runsThrough: String,
  sourceUrl: String,
  verifiedAt: String,
}, { timestamps: true });

module.exports = mongoose.model('RecurringNight', recurringNightSchema);
