const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  _id: { type: String },
  hostId: { type: String, required: true },
  name: String,
  date: String,
  time: String,
  location: String,
  description: String,
  music: String,
  dressCode: String,
  privacy: { type: String, enum: ['private', 'friends', 'public'], default: 'friends' },
  maxPeople: Number,
  invitedIds: [String],
  goingIds: [String],
  photo: String,
  photoPosition: String,
  endTime: String,
}, { _id: false, timestamps: true });

module.exports = mongoose.model('Party', partySchema);
