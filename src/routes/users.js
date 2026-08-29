const express = require('express');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  return { id: u._id, name: u.name, handle: u.handle, avatar: u.avatar, avatarImage: u.avatarImage, bio: u.bio };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/users/search?q=... — find real accounts by name or @handle, for
// the "search for a person" flow (separate from the app's local demo/mock
// people, which aren't real accounts).
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);
  const regex = new RegExp(escapeRegex(q), 'i');
  const users = await User.find({
    _id: { $ne: req.userId },
    $or: [{ name: regex }, { handle: regex }],
  }).limit(20);
  res.json(users.map(publicUser));
});

// GET /api/users/:id — a single public profile, for viewing someone else's
// page, including follower/following counts.
router.get('/:id', requireAuth, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const [followerCount, followingCount] = await Promise.all([
    Follow.countDocuments({ followingId: user._id }),
    Follow.countDocuments({ followerId: user._id }),
  ]);
  res.json({ ...publicUser(user), followerCount, followingCount });
});

module.exports = router;
