const express = require('express');
const Party = require('../models/Party');
const Conversation = require('../models/Conversation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function serialize(p) {
  const obj = p.toObject();
  return { ...obj, id: obj._id };
}

// GET /api/parties — everyone's parties (privacy filtering happens client-side,
// same as the rest of this app's follow/friend logic for now)
router.get('/', async (req, res) => {
  const parties = await Party.find().sort({ createdAt: -1 });
  res.json(parties.map(serialize));
});

// POST /api/parties  { id, name, date, time, location, description, music, dressCode, privacy, maxPeople, invitedIds, photo }
router.post('/', requireAuth, async (req, res) => {
  const { id, name, date, time, endTime, location, lat, lng, description, music, dressCode, privacy, maxPeople, invitedIds, photo, photoPosition } = req.body || {};
  if (!id || !name || !date || !time || !location) {
    return res.status(400).json({ error: 'id, name, date, time and location are required' });
  }
  try {
    const party = await Party.create({
      _id: id, hostId: req.userId, name, date, time, endTime, location, lat, lng, description, music, dressCode,
      privacy, maxPeople, invitedIds, photo, photoPosition, goingIds: [req.userId],
    });
    // Every community party gets its own group chat, created right
    // alongside it — the host plus everyone invited up front, so people can
    // actually start coordinating before anyone's formally RSVP'd. Anyone
    // who RSVPs going later (see /:id/join below) gets folded in too, which
    // matters for people who join via the public discover feed rather than
    // a direct invite.
    const initialMemberIds = Array.from(new Set([req.userId, ...(Array.isArray(invitedIds) ? invitedIds : [])]));
    const conversation = await Conversation.create({
      _id: `convo-party-${id}`, type: 'group', name: party.name, memberIds: initialMemberIds, partyId: id,
    });
    party.conversationId = conversation._id;
    await party.save();
    res.status(201).json(serialize(party));
  } catch (err) {
    if (err && err.code === 11000) return res.status(409).json({ error: 'Party already exists' });
    console.error('Create party failed:', err);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// PATCH /api/parties/:id — owner only. Lets the host change details and
// invite more people after the party already exists.
router.patch('/:id', requireAuth, async (req, res) => {
  const party = await Party.findOne({ _id: req.params.id });
  if (!party) return res.status(404).json({ error: 'Party not found' });
  if (party.hostId !== req.userId) return res.status(403).json({ error: 'Not your party' });
  const allowed = ['name', 'date', 'time', 'endTime', 'location', 'lat', 'lng', 'description', 'music', 'dressCode', 'privacy', 'maxPeople', 'invitedIds', 'photo', 'photoPosition'];
  for (const key of allowed) {
    if (req.body && req.body[key] !== undefined) party[key] = req.body[key];
  }
  await party.save();
  // Newly-invited people should land in the party's group chat right away,
  // same as at creation time — not just once they RSVP going. $addToSet
  // makes this safe to call every save regardless of who was already in it.
  if (party.conversationId && Array.isArray(party.invitedIds) && party.invitedIds.length > 0) {
    await Conversation.updateOne({ _id: party.conversationId }, { $addToSet: { memberIds: { $each: party.invitedIds } } });
  }
  res.json(serialize(party));
});

// DELETE /api/parties/:id — owner only
router.delete('/:id', requireAuth, async (req, res) => {
  const party = await Party.findOne({ _id: req.params.id });
  if (!party) return res.status(404).json({ error: 'Party not found' });
  if (party.hostId !== req.userId) return res.status(403).json({ error: 'Not your party' });
  await Party.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

// POST /api/parties/:id/join — toggle the logged-in user's RSVP. Marking
// yourself going also folds you into the party's linked group chat
// (un-marking does NOT remove you — leaving a chat is a separate,
// deliberate action, not an automatic side effect of an RSVP toggle).
router.post('/:id/join', requireAuth, async (req, res) => {
  const party = await Party.findOne({ _id: req.params.id });
  if (!party) return res.status(404).json({ error: 'Party not found' });
  const wasGoing = party.goingIds.includes(req.userId);
  const going = wasGoing
    ? party.goingIds.filter((id) => id !== req.userId)
    : [...party.goingIds, req.userId];
  party.goingIds = going;
  await party.save();
  if (!wasGoing && party.conversationId) {
    await Conversation.updateOne({ _id: party.conversationId }, { $addToSet: { memberIds: req.userId } });
  }
  res.json(serialize(party));
});

module.exports = router;
