const mongoose = require('mongoose');

// One CONFIRMED, dated event (club night, concert, beach club party, festival
// slot) sourced from an official venue site or primary ticketing platform by
// the external research pipeline. `_id` is the stable string id that
// pipeline mints (e.g. "momento-2026-09-03") — upserting by it is what lets
// re-syncing the same dataset update events in place instead of duplicating.
const marbellaEventSchema = new mongoose.Schema({
  _id: { type: String },
  city: { type: String, default: 'Marbella' }, // which city this event belongs to
  date: { type: String, required: true }, // "YYYY-MM-DD"
  dayOfWeek: String,
  startTime: String, // "HH:MM" or absent
  endTime: String,
  // 'event_specific' = this booking's own published time; 'venue_general_hours'
  // = no per-event time was published, so startTime/endTime fall back to the
  // venue's normal opening hours — the UI must flag this as approximate.
  timeConfidence: { type: String, enum: ['event_specific', 'venue_general_hours'] },
  venue: { type: String, required: true },
  venueArea: String,
  address: String,
  djOrArtist: String,
  eventName: String,
  type: { type: String, enum: ['club_night', 'concert', 'beach_club_party', 'festival_club_night'] },
  genre: String,
  dressCode: String,
  ageRestriction: String,
  ticketPrice: String,
  ticketUrl: String,
  description: String,
  sourceName: String,
  sourceUrl: String,
  verifiedAt: String,
  note: String,
}, { _id: false, timestamps: true });

marbellaEventSchema.index({ date: 1 });

module.exports = mongoose.model('MarbellaEvent', marbellaEventSchema);
