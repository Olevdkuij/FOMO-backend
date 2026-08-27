const express = require('express');
const Venue = require('../models/Venue');
const Review = require('../models/Review');

const router = express.Router();

function serializeVenue(v) {
  const obj = v.toObject();
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(obj.crowdUpdatedAt).getTime()) / 60000));
  return { ...obj, id: obj._id, crowdUpdatedMinsAgo: minsAgo };
}

// GET /api/venues
router.get('/', async (req, res) => {
  const venues = await Venue.find();
  res.json(venues.map(serializeVenue));
});

// GET /api/venues/:id
router.get('/:id', async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  res.json(serializeVenue(venue));
});

// POST /api/venues/:id/crowd-report  { status }
router.post('/:id/crowd-report', async (req, res) => {
  const { status } = req.body;
  const allowed = ['quiet', 'getting_busy', 'busy', 'packed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const venue = await Venue.findByIdAndUpdate(
    req.params.id,
    { crowdStatus: status, crowdUpdatedAt: new Date() },
    { new: true }
  );
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  res.json(serializeVenue(venue));
});

// GET /api/venues/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  const reviews = await Review.find({ venueId: req.params.id }).sort({ createdAt: -1 });
  res.json(reviews);
});

// POST /api/venues/:id/reviews  { userId, ratings, wouldReturn, text }
router.post('/:id/reviews', async (req, res) => {
  const { userId, ratings, wouldReturn, text } = req.body;
  if (!userId || !ratings) return res.status(400).json({ error: 'userId and ratings are required' });
  const review = await Review.create({ venueId: req.params.id, userId, ratings, wouldReturn, text });
  res.status(201).json(review);
});

module.exports = router;
