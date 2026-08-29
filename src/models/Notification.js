const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // recipient
  type: { type: String, enum: ['follow', 'like_post', 'like_recap'], required: true },
  actorId: { type: String, required: true }, // who did the thing
  targetId: String, // postId/recapId for likes, unused for follows
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
