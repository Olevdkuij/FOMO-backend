const express = require('express');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function serialize(n) {
  const obj = n.toObject();
  return { ...obj, id: obj._id };
}

// GET /api/notifications — the logged-in user's notifications, newest first
router.get('/', requireAuth, async (req, res) => {
  const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50);
  res.json(notifications.map(serialize));
});

// POST /api/notifications/read-all — mark everything read (matches the
// existing local MARK_NOTIFICATIONS_READ behavior, now persisted server-side)
router.post('/read-all', requireAuth, async (req, res) => {
  await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

module.exports = router;
