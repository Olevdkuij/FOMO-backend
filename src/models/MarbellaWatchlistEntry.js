const mongoose = require('mongoose');

// Announced lineups/artists with no confirmed calendar dates yet (e.g. a
// club names its summer headliners before releasing specific dates).
// Replaced wholesale on every sync, same reasoning as RecurringNight.
const watchlistSchema = new mongoose.Schema({
  city: { type: String, default: 'Marbella' },
  venue: { type: String, required: true },
  venueArea: String,
  seriesName: String,
  artistsAnnounced: [String],
  genre: String,
  status: String,
  sourceUrl: String,
  verifiedAt: String,
}, { timestamps: true });

module.exports = mongoose.model('MarbellaWatchlistEntry', watchlistSchema);
