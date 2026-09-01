const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { createNotification } = require('../utils/notify');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();

function serializeConvo(c, lastMessage) {
  const obj = c.toObject();
  return { ...obj, id: obj._id, lastMessage: lastMessage || null };
}
function serializeMessage(m) {
  const obj = m.toObject();
  return { ...obj, id: obj._id };
}

// GET /api/conversations — every conversation the caller is a member of,
// newest activity first, each with a lastMessage preview for the list
// screen. This is the sync layer under the frontend's local-first
// `conversations` reducer state (see AppState.tsx) — the frontend still
// keeps its own copy for instant optimistic UI, this is what lets a
// message one person sends actually reach everyone else's phone.
router.get('/', requireAuth, async (req, res) => {
  const convos = await Conversation.find({ memberIds: req.userId }).sort({ updatedAt: -1 });
  const ids = convos.map((c) => c._id);
  const lastMessages = await Message.aggregate([
    { $match: { conversationId: { $in: ids } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$conversationId', doc: { $first: '$$ROOT' } } },
  ]);
  const lastByConvo = new Map(lastMessages.map((m) => [m._id, { ...m.doc, id: m.doc._id }]));
  res.json(convos.map((c) => serializeConvo(c, lastByConvo.get(c._id))));
});

// POST /api/conversations — create or upsert a conversation. The frontend
// generates the id itself (dmId() for DMs, group-<ts>-<rand> for groups) so
// this is idempotent by design: calling it again for an id that already
// exists just adds the caller to memberIds rather than erroring, which is
// what lets ENSURE_DM-style flows call this unconditionally.
// Body: { id, type: 'dm'|'group', name?, photo?, memberIds, partyId? }
router.post('/', requireAuth, async (req, res) => {
  const { id, type, name, photo, memberIds, partyId } = req.body || {};
  if (!id || !type || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: 'id, type and memberIds are required' });
  }
  if (!memberIds.includes(req.userId)) memberIds.push(req.userId);

  const existing = await Conversation.findById(id);
  if (existing) {
    const merged = Array.from(new Set([...existing.memberIds, ...memberIds]));
    existing.memberIds = merged;
    if (name) existing.name = name;
    if (photo) existing.photo = photo;
    await existing.save();
    return res.json(serializeConvo(existing));
  }

  const convo = await Conversation.create({ _id: id, type, name, photo, memberIds, partyId: partyId || null });
  res.status(201).json(serializeConvo(convo));
});

// GET /api/conversations/:id/messages — full history, oldest first. Members
// only.
router.get('/:id/messages', requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!convo.memberIds.includes(req.userId)) return res.status(403).json({ error: 'Not a member of this conversation' });
  const messages = await Message.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
  res.json(messages.map(serializeMessage));
});

// POST /api/conversations/:id/messages — send a message. Body carries the
// frontend's own locally-generated message id (cm-<ts>-<rand>) so the
// client and server always agree on id, which is what lets the frontend
// merge server-fetched messages into local state without duplicating the
// one it just optimistically added itself.
// Body: { id, text?, venueId?, partyId?, marbellaEventId?, photo?, video?, poster?, replyToId? }
router.post('/:id/messages', requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!convo.memberIds.includes(req.userId)) return res.status(403).json({ error: 'Not a member of this conversation' });

  const { id, text, venueId, partyId, marbellaEventId, photo, video, poster, replyToId } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id is required' });

  const message = await Message.create({
    _id: id, conversationId: req.params.id, senderId: req.userId, text,
    venueId, partyId, marbellaEventId, photo, video, poster, replyToId,
  });
  convo.updatedAt = new Date();
  await convo.save();
  res.status(201).json(serializeMessage(message));
});

// POST /api/conversations/:id/ask-going-out — the "who wants to go out
// tonight?" prompt. Posts a distinct going_out_prompt message into the
// thread and notifies every other member (in-app Notification + real push
// if they have a registered device token).
router.post('/:id/ask-going-out', requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!convo.memberIds.includes(req.userId)) return res.status(403).json({ error: 'Not a member of this conversation' });

  const asker = await User.findById(req.userId);
  const askerName = asker ? asker.name : 'Someone';
  const messageId = req.body?.id || `cm-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const message = await Message.create({
    _id: messageId, conversationId: req.params.id, senderId: req.userId,
    text: `${askerName} asked who's going out tonight 🎉`, kind: 'going_out_prompt',
  });
  convo.updatedAt = new Date();
  await convo.save();

  const others = convo.memberIds.filter((id) => id !== req.userId);
  await Promise.all(others.map(async (memberId) => {
    await createNotification({ userId: memberId, type: 'going_out_prompt', actorId: req.userId, targetId: convo._id });
    await sendPushToUser(User, memberId, {
      title: convo.name || 'FOMO',
      body: `${askerName} asked who's going out tonight — tap to reply`,
      data: { conversationId: convo._id, kind: 'going_out_prompt' },
    });
  }));

  res.status(201).json(serializeMessage(message));
});

// POST /api/conversations/:id/members — add members (used when someone
// joins a community party and gets folded into its linked group chat — see
// routes/parties.js). Body: { memberIds: [...] }
router.post('/:id/members', requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!convo.memberIds.includes(req.userId)) return res.status(403).json({ error: 'Not a member of this conversation' });
  const { memberIds } = req.body || {};
  if (!Array.isArray(memberIds)) return res.status(400).json({ error: 'memberIds is required' });
  convo.memberIds = Array.from(new Set([...convo.memberIds, ...memberIds]));
  await convo.save();
  res.json(serializeConvo(convo));
});

// PATCH /api/conversations/:id — rename / change photo. Any member can (as
// with the existing local-only behavior this replaces).
router.patch('/:id', requireAuth, async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  if (!convo.memberIds.includes(req.userId)) return res.status(403).json({ error: 'Not a member of this conversation' });
  const { name, photo } = req.body || {};
  if (name !== undefined) convo.name = name;
  if (photo !== undefined) convo.photo = photo;
  await convo.save();
  res.json(serializeConvo(convo));
});

module.exports = router;
