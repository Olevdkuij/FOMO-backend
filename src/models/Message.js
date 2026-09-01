const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  _id: { type: String },
  conversationId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  text: String,
  venueId: String,
  partyId: String,
  marbellaEventId: String,
  photo: String,
  video: String,
  poster: String,
  likedBy: { type: [String], default: [] },
  replyToId: String,
  pinned: { type: Boolean, default: false },
  // Special message kind used by the "who's going out tonight?" prompt (see
  // routes/conversations.js) — the frontend renders these distinctly and
  // they're what triggers a notification to the rest of the group.
  kind: { type: String, enum: ['text', 'going_out_prompt'], default: 'text' },
}, { _id: false, timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
