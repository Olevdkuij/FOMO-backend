const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  label: String,
  venueId: String,
  time: String,
}, { _id: false });

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: String, required: true },
  text: String,
  createdAgo: String,
}, { _id: false });

const nightRecapSchema = new mongoose.Schema({
  _id: { type: String },
  userId: { type: String, required: true },
  title: String,
  stops: [stopSchema],
  taggedFriendIds: [String],
  venueId: String,
  eventTitle: String,
  time: String,
  createdAgo: String,
  likes: { type: Number, default: 0 },
  video: String,
  caption: String,
  taggedVenueIds: [String],
  status: { type: String, enum: ['draft', 'posted'], default: 'posted' },
  poster: String,
  comments: [commentSchema],
  likedBy: { type: [String], default: [] },
}, { _id: false, timestamps: true });

module.exports = mongoose.model('NightRecap', nightRecapSchema);
