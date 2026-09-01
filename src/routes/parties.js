const express = require('express');
const Party = require('../models/Party');
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

// POST /api/parties/:id/join — toggle the logged-in user's RSVP
router.post('/:id/join', requireAuth, async (req, res) => {
  const party = await Party.findOne({ _id: req.params.id });
  if (!party) return res.status(404).json({ error: 'Party not found' });
  const going = party.goingIds.includes(req.userId)
    ? party.goingIds.filter((id) => id !== req.userId)
    : [...party.goingIds, req.userId];
  party.goingIds = going;
  await party.save();
  res.json(serialize(party));
});

module.exports = router;
