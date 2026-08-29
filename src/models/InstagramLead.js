const mongoose = require('mongoose');

// UNVERIFIED sightings from social search — never to be conflated with
// MarbellaEvent. The UI must always label these as rumored/unverified and
// keep them out of the confirmed-events list. Replaced wholesale on every
// sync, same reasoning as RecurringNight.
const instagramLeadSchema = new mongoose.Schema({
  venue: { type: String, required: true },
  claimedDate: String,
  claimedDjOrEvent: String,
  snippetText: String,
  sourceUrl: String,
  foundAt: String,
  confidence: { type: String, default: 'unverified' },
}, { timestamps: true });

module.exports = mongoose.model('InstagramLead', instagramLeadSchema);
