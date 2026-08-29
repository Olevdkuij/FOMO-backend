const Notification = require('../models/Notification');

// Best-effort notification creation — never let a notification failure break
// the follow/like action that triggered it. Never notifies someone about
// their own action (e.g. liking your own post).
async function createNotification({ userId, type, actorId, targetId }) {
  if (!userId || !actorId || userId === actorId) return;
  try {
    await Notification.create({ userId, type, actorId, targetId });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

module.exports = { createNotification };
