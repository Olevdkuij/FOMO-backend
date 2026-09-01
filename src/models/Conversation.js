const mongoose = require('mongoose');

// A DM or group chat. Ids are client-generated (dm-<sorted-user-ids> for
// DMs via the frontend's dmId() util, group-<timestamp>-<random> for
// groups) and upserted here rather than server-assigned, so the frontend's
// existing local-first reducer can keep using the same id it already
// creates locally — this collection is the sync layer underneath that,
// not a replacement for it.
const conversationSchema = new mongoose.Schema({
  _id: { type: String },
  type: { type: String, enum: ['dm', 'group'], required: true },
  name: String,
  photo: String,
  memberIds: { type: [String], default: [] },
  // Set when this conversation was auto-created for a community party (see
  // routes/parties.js) — lets the frontend group these under their own
  // "Community Parties" tab in Chat instead of the regular conversation list.
  partyId: { type: String, default: null },
}, { _id: false, timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
