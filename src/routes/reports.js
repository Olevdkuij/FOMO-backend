const express = require('express');
const Report = require('../models/Report');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const TARGET_TYPES = ['user', 'recap', 'post', 'party', 'message'];

// POST /api/reports  { targetType, targetId, targetOwnerId, reason, details? }
// Files a report. There's no in-app moderation dashboard yet — reports land
// in the database for a trusted (isAdmin) account to review via GET below —
// but this is the real, working report pipeline Apple requires apps with
// user-generated content and person-to-person contact to have, not a
// placeholder.
router.post('/', requireAuth, async (req, res) => {
  const { targetType, targetId, targetOwnerId, reason, details } = req.body || {};
  if (!TARGET_TYPES.includes(targetType)) {
    return res.status(400).json({ error: 'Invalid targetType' });
  }
  if (!targetId || !targetOwnerId || !reason) {
    return res.status(400).json({ error: 'targetId, targetOwnerId, and reason are required' });
  }
  try {
    await Report.create({
      reporterId: req.userId,
      targetType,
      targetId: String(targetId),
      targetOwnerId: String(targetOwnerId),
      reason: String(reason).slice(0, 200),
      details: details ? String(details).slice(0, 2000) : '',
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Report submission failed:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

async function requireAdmin(req, res, next) {
  const user = await User.findById(req.userId);
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Not authorized' });
  next();
}

// GET /api/reports?status=open — for review by a trusted account.
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const status = ['open', 'reviewed'].includes(req.query.status) ? req.query.status : 'open';
  const reports = await Report.find({ status }).sort({ createdAt: -1 }).limit(200);
  res.json(reports);
});

// PATCH /api/reports/:id  { status: 'reviewed' }
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const status = req.body && req.body.status;
  if (!['open', 'reviewed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

module.exports = router;
