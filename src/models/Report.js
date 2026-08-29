const mongoose = require('mongoose');

// A user-submitted report against another account or a specific piece of
// content (a recap, post, party, or chat message/conversation).
// `targetOwnerId` is who is actually accountable for the reported thing —
// for a 'user' report it's the same as targetId, for content it's whoever
// posted/hosts it — so reports can be reviewed per-account regardless of
// what type of thing was reported.
const reportSchema = new mongoose.Schema({
  reporterId: { type: String, required: true },
  targetType: { type: String, enum: ['user', 'recap', 'post', 'party', 'message'], required: true },
  targetId: { type: String, required: true },
  targetOwnerId: { type: String, required: true },
  reason: { type: String, required: true },
  details: { type: String, default: '' },
  status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
