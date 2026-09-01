const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // recipient
  type: { type: String, enum: ['follow', 'like_post', 'like_recap', 'going_out_prompt', 'party_invite'], required: true },
  actorId: { type: String, required: true }, // who did the thing
  targetId: String, // postId/recapId for likes, conversationId for going_out_prompt, partyId for party_invite
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
