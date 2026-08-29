const express = require('express');
const Block = require('../models/Block');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/blocks — accounts the logged-in user has blocked.
router.get('/', requireAuth, async (req, res) => {
  const rows = await Block.find({ blockerId: req.userId });
  res.json(rows.map((r) => r.blockedId));
});

// POST /api/blocks/:userId — block someone. Also tears down any follow
// relationship between the two people in either direction, so a blocked
// account immediately stops showing up as a follower/following and can't
// re-follow while blocked (enforced in follows.js).
router.post('/:userId', requireAuth, async (req, res) => {
  const targetId = req.params.userId;
  if (targetId === req.userId) return res.status(400).json({ error: "Can't block yourself" });
  const target = await User.findById(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  try {
    await Block.updateOne(
      { blockerId: req.userId, blockedId: targetId },
      { $setOnInsert: { blockerId: req.userId, blockedId: targetId } },
      { upsert: true }
    );
    await Follow.deleteMany({
      $or: [
        { followerId: req.userId, followingId: targetId },
        { followerId: targetId, followingId: req.userId },
      ],
    });
    res.json({ blocked: true });
  } catch (err) {
    console.error('Block failed:', err);
    res.status(500).json({ error: 'Failed to block' });
  }
});

// DELETE /api/blocks/:userId — unblock.
router.delete('/:userId', requireAuth, async (req, res) => {
  try {
    await Block.deleteOne({ blockerId: req.userId, blockedId: req.params.userId });
    res.json({ blocked: false });
  } catch (err) {
    console.error('Unblock failed:', err);
    res.status(500).json({ error: 'Failed to unblock' });
  }
});

module.exports = router;
