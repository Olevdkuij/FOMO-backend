const express = require('express');
const NightRecap = require('../models/NightRecap');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();

function serialize(r) {
  const obj = r.toObject();
  return { ...obj, id: obj._id };
}

// GET /api/recaps — the public feed (posted recaps only)
router.get('/', async (req, res) => {
  const recaps = await NightRecap.find({ status: 'posted' }).sort({ createdAt: -1 });
  res.json(recaps.map(serialize));
});

// GET /api/recaps/mine — the logged-in user's own recaps, drafts included
router.get('/mine', requireAuth, async (req, res) => {
  const recaps = await NightRecap.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(recaps.map(serialize));
});

// POST /api/recaps — create (or overwrite-by-id, for draft -> posted transitions)
router.post('/', requireAuth, async (req, res) => {
  const { id, title, stops, taggedFriendIds, venueId, eventTitle, time, createdAgo, likes, video, caption, taggedVenueIds, status, poster } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id is required' });
  try {
    const recap = await NightRecap.findOneAndUpdate(
      { _id: id, userId: req.userId },
      {
        _id: id, userId: req.userId, title, stops, taggedFriendIds, venueId, eventTitle, time,
        createdAgo, likes, video, caption, taggedVenueIds, status, poster,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(serialize(recap));
  } catch (err) {
    console.error('Create/update recap failed:', err);
    res.status(500).json({ error: 'Failed to save recap' });
  }
});

// DELETE /api/recaps/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const recap = await NightRecap.findOne({ _id: req.params.id });
  if (!recap) return res.status(404).json({ error: 'Recap not found' });
  if (recap.userId !== req.userId) return res.status(403).json({ error: 'Not your recap' });
  await NightRecap.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

// POST /api/recaps/:id/like — toggle, same shape as the posts like route
router.post('/:id/like', requireAuth, async (req, res) => {
  const recap = await NightRecap.findOne({ _id: req.params.id });
  if (!recap) return res.status(404).json({ error: 'Recap not found' });
  const alreadyLiked = recap.likedBy.includes(req.userId);
  if (alreadyLiked) {
    recap.likedBy = recap.likedBy.filter((id) => id !== req.userId);
    recap.likes = Math.max(0, recap.likes - 1);
  } else {
    recap.likedBy.push(req.userId);
    recap.likes += 1;
    createNotification({ userId: recap.userId, type: 'like_recap', actorId: req.userId, targetId: recap._id });
    const liker = await User.findById(req.userId);
    sendPushToUser(User, recap.userId, {
      title: 'FOMO',
      body: `${liker ? liker.name : 'Someone'} liked your recap`,
      data: { type: 'like_recap', actorId: req.userId, targetId: String(recap._id) },
    });
  }
  await recap.save();
  res.json(serialize(recap));
});

// POST /api/recaps/:id/comments  { id, text, createdAgo }
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { id, text, createdAgo } = req.body || {};
  if (!id || !text) return res.status(400).json({ error: 'id and text are required' });
  const recap = await NightRecap.findOneAndUpdate(
    { _id: req.params.id },
    { $push: { comments: { id, userId: req.userId, text, createdAgo } } },
    { new: true }
  );
  if (!recap) return res.status(404).json({ error: 'Recap not found' });
  res.status(201).json(serialize(recap));
});

module.exports = router;
