const express = require('express');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const { requireSyncSecret } = require('../middleware/syncAuth');

const router = express.Router();

function serializeVenue(v) {
  const obj = v.toObject();
  const minsAgo = Math.max(0, Math.round((Date.now() - new Date(obj.crowdUpdatedAt).getTime()) / 60000));
  return { ...obj, id: obj._id, crowdUpdatedMinsAgo: minsAgo };
}

// GET /api/venues — optional ?city= filter (e.g. ?city=Málaga). Omit to get
// every venue across all cities.
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.city) filter.city = req.query.city;
  const venues = await Venue.find(filter);
  res.json(venues.map(serializeVenue));
});

// POST /api/venues/sync — adds or updates venues by id. Same shared-secret
// pattern as /api/marbella-events/sync, but additive-only (upsert, no
// pruning): the venue directory is a small curated set maintained by hand,
// not a rotating calendar, so a sync here should never be able to silently
// delete an existing venue just because it wasn't in this particular
// payload. Body: { venues: [ ... same shape as seed.js's venue objects ... ] }
router.post('/sync', requireSyncSecret, async (req, res) => {
  const venues = Array.isArray(req.body.venues) ? req.body.venues : [];
  let synced = 0;
  for (const v of venues) {
    if (!v.id && !v._id) continue; // skip malformed entries rather than failing the whole sync
    const _id = v.id || v._id;
    await Venue.findByIdAndUpdate(
      _id,
      {
        _id,
        city: v.city || 'Marbella',
        name: v.name,
        area: v.area,
        address: v.address,
        type: v.type,
        genres: v.genres,
        rating: v.rating,
        image: v.image,
        lat: v.lat,
        lng: v.lng,
        crowdStatus: v.crowdStatus || 'quiet',
        ratings: v.ratings,
        bestNights: v.bestNights,
        bestArrival: v.bestArrival,
        opening: v.opening,
        closing: v.closing,
        dressCode: v.dressCode,
        verified: v.verified,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    synced++;
  }
  res.json({ ok: true, venues_synced: synced });
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
