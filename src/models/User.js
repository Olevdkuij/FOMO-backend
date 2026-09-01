const mongoose = require('mongoose');

// Real, multi-user accounts. Ids are plain strings (like Venue's) rather than
// ObjectIds so they stay compatible with the frontend's existing 'u-*' id
// convention — new signups get a generated 'u-<random>' id, chosen in the
// signup route. Defaults below are for a brand-new account starting from
// zero; your own existing account ('u-ole') was created before these
// defaults existed and keeps whatever values are already saved for it.
const userSchema = new mongoose.Schema(
  {
    _id: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    handle: { type: String, required: true },
    avatar: { type: String, default: 'U' },
    avatarImage: { type: String, default: null },
    city: { type: String, default: 'Marbella' },
    bio: { type: String, default: '' },
    genres: { type: [String], default: [] },
    rankLevel: { type: Number, default: 1 },
    rankName: { type: String, default: 'Newcomer' },
    stats: {
      nightsOut: { type: Number, default: 0 },
      venues: { type: Number, default: 0 },
      events: { type: Number, default: 0 },
      peopleMet: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 },
    },
    favouriteVenueIds: { type: [String], default: [] },
    // Registered APNs device tokens for real push notifications (lock-screen
    // alerts) — a person can have more than one (old phone + new phone).
    deviceTokens: { type: [String], default: [] },
    verified: { type: Boolean, default: false },
    resetCodeHash: { type: String, default: null },
    resetCodeExpires: { type: Date, default: null },
    onboardingComplete: { type: Boolean, default: false },
    // Lets a small number of trusted accounts review submitted reports
    // (GET/PATCH /api/reports) — flip manually in the DB for now, there's
    // no admin UI yet.
    isAdmin: { type: Boolean, default: false },
  },
  { _id: false, timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
