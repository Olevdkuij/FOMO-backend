const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true },
  venueId: String,
  caption: String,
  photo: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  createdAgo: String,
  kind: { type: String, enum: ['post', 'drop'], default: 'post' },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  taggedUserIds: { type: [String], default: [] },
  likedBy: { type: [String], default: [] },
  // Stories (kind: 'drop') normally vanish from the app 12h after posting
  // (see isActiveStory on the frontend) — highlighting one is what keeps it
  // around after that, shown in the profile's permanent Highlights reel.
  highlighted: { type: Boolean, default: false },
}, { _id: false, timestamps: true });

module.exports = mongoose.model('Post', postSchema);
