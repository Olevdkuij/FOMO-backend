const express = require('express');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const NightRecap = require('../models/NightRecap');
const Notification = require('../models/Notification');
const Block = require('../models/Block');
const Report = require('../models/Report');
const Party = require('../models/Party');
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

module.exports = router;
