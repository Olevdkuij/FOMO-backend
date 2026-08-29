const express = require('express');
const Follow = require('../models/Follow');
const Block = require('../models/Block');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');

const router = express.Router();

function publicUser(u) {
  return { id: u._id, name: u.name, handle: u.handle, avatar: u.avatar, avatarImage: u.avatarImage, bio: u.bio };
}

// POST /api/follows/:userId — toggle follow. 404s if the target isn't a real
// account (e.g. one of the app's placeholder/demo people) — the frontend
// falls back to local-only follow state in that case.
router.post('/:userId', requireAuth, async (req, res) => {
  const targetId = req.params.userId;
  if (targetId === req.userId) return res.status(400).json({ error: "Can't follow yourself" });
  const target = await User.findById(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const blocked = await Block.findOne({
    $or: [
      { blockerId: req.userId, blockedId: targetId },
      { blockerId: targetId, blockedId: req.userId },
    ],
  });
  if (blocked) return res.status(403).json({ error: 'Not available' });

  const existing = await Follow.findOne({ followerId: req.userId, followingId: targetId });
  if (existing) {
    await Follow.deleteOne({ _id: existing._id });
    return res.json({ following: false });
  }
  try {
    await Follow.create({ followerId: req.userId, followingId: targetId });
    createNotification({ userId: targetId, type: 'follow', actorId: req.userId });
    res.json({ following: true });
  } catch (err) {
    if (err && err.code === 11000) return res.json({ following: true }); // already following, race-safe
    console.error('Follow failed:', err);
    res.status(500).json({ error: 'Failed to follow' });
  }
});

// GET /api/follows/following — real accounts the logged-in user follows
router.get('/following', requireAuth, async (req, res) => {
  const rows = await Follow.find({ followerId: req.userId });
  const users = await User.find({ _id: { $in: rows.map((r) => r.followingId) } });
  res.json(users.map(publicUser));
});

// GET /api/follows/followers — real accounts that follow the logged-in user
router.get('/followers', requireAuth, async (req, res) => {
  const rows = await Follow.find({ followingId: req.userId });
  const users = await User.find({ _id: { $in: rows.map((r) => r.followerId) } });
  res.json(users.map(publicUser));
});

module.exports = router;
