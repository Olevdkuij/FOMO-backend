const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const NightRecap = require('../models/NightRecap');
const Notification = require('../models/Notification');
const Block = require('../models/Block');
const Report = require('../models/Report');
const Party = require('../models/Party');
const RecurringNight = require('../models/RecurringNight');
const MarbellaWatchlistEntry = require('../models/MarbellaWatchlistEntry');
const InstagramLead = require('../models/InstagramLead');
const { requireSyncSecret } = require('../middleware/syncAuth');

const router = express.Router();

// Small maintenance surface for cleaning up test/throwaway accounts created
// during development, before real friends start using the app. Reuses the
// same shared secret as the events sync (x-sync-secret) rather than adding
// a second one — this is a solo-dev tool, not a user-facing feature.
router.use(requireSyncSecret);

// GET /api/admin/users — list every account with enough context to tell a
// real signup apart from a leftover test one (email, when it was created,
// and how much content it actually has).
router.get('/users', async (req, res) => {
  const users = await User.find({}).sort({ createdAt: 1 });
  const results = await Promise.all(
    users.map(async (u) => {
      const [postCount, recapCount, followingCount, followerCount] = await Promise.all([
        Post.countDocuments({ userId: u._id }),
        NightRecap.countDocuments({ userId: u._id }),
        Follow.countDocuments({ followerId: u._id }),
        Follow.countDocuments({ followingId: u._id }),
      ]);
      return {
        id: u._id,
        email: u.email,
        name: u.name,
        handle: u.handle,
        onboardingComplete: u.onboardingComplete,
        createdAt: u.createdAt,
        postCount,
        recapCount,
        followingCount,
        followerCount,
      };
    })
  );
  res.json(results);
});

// DELETE /api/admin/users/:id — permanently remove one account and
// everything it owns (posts, recaps, follow edges in both directions,
// notifications where it's the recipient or the actor, blocks in both
// directions, reports it filed, parties it hosts).
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const [
    { deletedCount: posts },
    { deletedCount: recaps },
    { deletedCount: followingEdges },
    { deletedCount: followerEdges },
    { deletedCount: notifsReceived },
    { deletedCount: notifsSent },
    { deletedCount: blocksMade },
    { deletedCount: blocksReceived },
    { deletedCount: reportsFiled },
    { deletedCount: partiesHosted },
  ] = await Promise.all([
    Post.deleteMany({ userId: id }),
    NightRecap.deleteMany({ userId: id }),
    Follow.deleteMany({ followerId: id }),
    Follow.deleteMany({ followingId: id }),
    Notification.deleteMany({ userId: id }),
    Notification.deleteMany({ actorId: id }),
    Block.deleteMany({ blockerId: id }),
    Block.deleteMany({ blockedId: id }),
    Report.deleteMany({ reporterId: id }),
    Party.deleteMany({ hostId: id }),
  ]);
  await User.deleteOne({ _id: id });

  res.json({
    deleted: { id, email: user.email },
    cascaded: {
      posts, recaps, followingEdges, followerEdges,
      notifsReceived, notifsSent, blocksMade, blocksReceived,
      reportsFiled, partiesHosted,
    },
  });
});

// POST /api/admin/users/:id/reset-password — manually set someone's password,
// bypassing email entirely. Stopgap for while Resend is still in
// unverified-domain mode (it can only email the account owner's own
// address, so anyone else who forgets their password can't self-serve yet).
// { newPassword: string }
router.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'newPassword is required and must be at least 6 characters' });
  }
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetCodeHash = null;
  user.resetCodeExpires = null;
  await user.save();

  res.json({ ok: true, id: user._id, email: user.email });
});


// One-off cleanup: RecurringNight/MarbellaWatchlistEntry/InstagramLead
// documents created before the `city` field existed on those schemas never
// got it written to disk (Mongoose only applies the schema default when
// *reading* a doc that's missing the field, not when matching a query
// filter against it) — so a city-scoped sync's deleteMany({city}) silently
// matched nothing for them, and insertMany then added a second, correctly-
// tagged copy alongside the untouched originals, doubling all three
// collections. This deletes the ones missing a stored `city` field
// entirely. Safe today because every pre-existing document in these three
// collections is implicitly Marbella-only (Málaga has never had recurring
// nights/watchlist/leads synced), so nothing needs a city check here.
router.post('/purge-legacy-nocity', async (req, res) => {
  const [rn, wl, leads] = await Promise.all([
    RecurringNight.deleteMany({ city: { $exists: false } }),
    MarbellaWatchlistEntry.deleteMany({ city: { $exists: false } }),
    InstagramLead.deleteMany({ city: { $exists: false } }),
  ]);
  res.json({
    ok: true,
    recurring_nights_deleted: rn.deletedCount,
    watchlist_deleted: wl.deletedCount,
    instagram_leads_deleted: leads.deletedCount,
  });
});

module.exports = router;
